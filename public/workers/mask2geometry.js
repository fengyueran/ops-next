/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createEndpoint": () => (/* binding */ createEndpoint),
/* harmony export */   "expose": () => (/* binding */ expose),
/* harmony export */   "proxy": () => (/* binding */ proxy),
/* harmony export */   "proxyMarker": () => (/* binding */ proxyMarker),
/* harmony export */   "releaseProxy": () => (/* binding */ releaseProxy),
/* harmony export */   "transfer": () => (/* binding */ transfer),
/* harmony export */   "transferHandlers": () => (/* binding */ transferHandlers),
/* harmony export */   "windowEndpoint": () => (/* binding */ windowEndpoint),
/* harmony export */   "wrap": () => (/* binding */ wrap)
/* harmony export */ });
/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const proxyMarker = Symbol("Comlink.proxy");
const createEndpoint = Symbol("Comlink.endpoint");
const releaseProxy = Symbol("Comlink.releaseProxy");
const throwMarker = Symbol("Comlink.thrown");
const isObject = (val) => (typeof val === "object" && val !== null) || typeof val === "function";
/**
 * Internal transfer handle to handle objects marked to proxy.
 */
const proxyTransferHandler = {
    canHandle: (val) => isObject(val) && val[proxyMarker],
    serialize(obj) {
        const { port1, port2 } = new MessageChannel();
        expose(obj, port1);
        return [port2, [port2]];
    },
    deserialize(port) {
        port.start();
        return wrap(port);
    },
};
/**
 * Internal transfer handler to handle thrown exceptions.
 */
const throwTransferHandler = {
    canHandle: (value) => isObject(value) && throwMarker in value,
    serialize({ value }) {
        let serialized;
        if (value instanceof Error) {
            serialized = {
                isError: true,
                value: {
                    message: value.message,
                    name: value.name,
                    stack: value.stack,
                },
            };
        }
        else {
            serialized = { isError: false, value };
        }
        return [serialized, []];
    },
    deserialize(serialized) {
        if (serialized.isError) {
            throw Object.assign(new Error(serialized.value.message), serialized.value);
        }
        throw serialized.value;
    },
};
/**
 * Allows customizing the serialization of certain values.
 */
const transferHandlers = new Map([
    ["proxy", proxyTransferHandler],
    ["throw", throwTransferHandler],
]);
function expose(obj, ep = self) {
    ep.addEventListener("message", function callback(ev) {
        if (!ev || !ev.data) {
            return;
        }
        const { id, type, path } = Object.assign({ path: [] }, ev.data);
        const argumentList = (ev.data.argumentList || []).map(fromWireValue);
        let returnValue;
        try {
            const parent = path.slice(0, -1).reduce((obj, prop) => obj[prop], obj);
            const rawValue = path.reduce((obj, prop) => obj[prop], obj);
            switch (type) {
                case 0 /* GET */:
                    {
                        returnValue = rawValue;
                    }
                    break;
                case 1 /* SET */:
                    {
                        parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
                        returnValue = true;
                    }
                    break;
                case 2 /* APPLY */:
                    {
                        returnValue = rawValue.apply(parent, argumentList);
                    }
                    break;
                case 3 /* CONSTRUCT */:
                    {
                        const value = new rawValue(...argumentList);
                        returnValue = proxy(value);
                    }
                    break;
                case 4 /* ENDPOINT */:
                    {
                        const { port1, port2 } = new MessageChannel();
                        expose(obj, port2);
                        returnValue = transfer(port1, [port1]);
                    }
                    break;
                case 5 /* RELEASE */:
                    {
                        returnValue = undefined;
                    }
                    break;
            }
        }
        catch (value) {
            returnValue = { value, [throwMarker]: 0 };
        }
        Promise.resolve(returnValue)
            .catch((value) => {
            return { value, [throwMarker]: 0 };
        })
            .then((returnValue) => {
            const [wireValue, transferables] = toWireValue(returnValue);
            ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
            if (type === 5 /* RELEASE */) {
                // detach and deactive after sending release response above.
                ep.removeEventListener("message", callback);
                closeEndPoint(ep);
            }
        });
    });
    if (ep.start) {
        ep.start();
    }
}
function isMessagePort(endpoint) {
    return endpoint.constructor.name === "MessagePort";
}
function closeEndPoint(endpoint) {
    if (isMessagePort(endpoint))
        endpoint.close();
}
function wrap(ep, target) {
    return createProxy(ep, [], target);
}
function throwIfProxyReleased(isReleased) {
    if (isReleased) {
        throw new Error("Proxy has been released and is not useable");
    }
}
function createProxy(ep, path = [], target = function () { }) {
    let isProxyReleased = false;
    const proxy = new Proxy(target, {
        get(_target, prop) {
            throwIfProxyReleased(isProxyReleased);
            if (prop === releaseProxy) {
                return () => {
                    return requestResponseMessage(ep, {
                        type: 5 /* RELEASE */,
                        path: path.map((p) => p.toString()),
                    }).then(() => {
                        closeEndPoint(ep);
                        isProxyReleased = true;
                    });
                };
            }
            if (prop === "then") {
                if (path.length === 0) {
                    return { then: () => proxy };
                }
                const r = requestResponseMessage(ep, {
                    type: 0 /* GET */,
                    path: path.map((p) => p.toString()),
                }).then(fromWireValue);
                return r.then.bind(r);
            }
            return createProxy(ep, [...path, prop]);
        },
        set(_target, prop, rawValue) {
            throwIfProxyReleased(isProxyReleased);
            // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
            // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯
            const [value, transferables] = toWireValue(rawValue);
            return requestResponseMessage(ep, {
                type: 1 /* SET */,
                path: [...path, prop].map((p) => p.toString()),
                value,
            }, transferables).then(fromWireValue);
        },
        apply(_target, _thisArg, rawArgumentList) {
            throwIfProxyReleased(isProxyReleased);
            const last = path[path.length - 1];
            if (last === createEndpoint) {
                return requestResponseMessage(ep, {
                    type: 4 /* ENDPOINT */,
                }).then(fromWireValue);
            }
            // We just pretend that `bind()` didn’t happen.
            if (last === "bind") {
                return createProxy(ep, path.slice(0, -1));
            }
            const [argumentList, transferables] = processArguments(rawArgumentList);
            return requestResponseMessage(ep, {
                type: 2 /* APPLY */,
                path: path.map((p) => p.toString()),
                argumentList,
            }, transferables).then(fromWireValue);
        },
        construct(_target, rawArgumentList) {
            throwIfProxyReleased(isProxyReleased);
            const [argumentList, transferables] = processArguments(rawArgumentList);
            return requestResponseMessage(ep, {
                type: 3 /* CONSTRUCT */,
                path: path.map((p) => p.toString()),
                argumentList,
            }, transferables).then(fromWireValue);
        },
    });
    return proxy;
}
function myFlat(arr) {
    return Array.prototype.concat.apply([], arr);
}
function processArguments(argumentList) {
    const processed = argumentList.map(toWireValue);
    return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
}
const transferCache = new WeakMap();
function transfer(obj, transfers) {
    transferCache.set(obj, transfers);
    return obj;
}
function proxy(obj) {
    return Object.assign(obj, { [proxyMarker]: true });
}
function windowEndpoint(w, context = self, targetOrigin = "*") {
    return {
        postMessage: (msg, transferables) => w.postMessage(msg, targetOrigin, transferables),
        addEventListener: context.addEventListener.bind(context),
        removeEventListener: context.removeEventListener.bind(context),
    };
}
function toWireValue(value) {
    for (const [name, handler] of transferHandlers) {
        if (handler.canHandle(value)) {
            const [serializedValue, transferables] = handler.serialize(value);
            return [
                {
                    type: 3 /* HANDLER */,
                    name,
                    value: serializedValue,
                },
                transferables,
            ];
        }
    }
    return [
        {
            type: 0 /* RAW */,
            value,
        },
        transferCache.get(value) || [],
    ];
}
function fromWireValue(value) {
    switch (value.type) {
        case 3 /* HANDLER */:
            return transferHandlers.get(value.name).deserialize(value.value);
        case 0 /* RAW */:
            return value.value;
    }
}
function requestResponseMessage(ep, msg, transfers) {
    return new Promise((resolve) => {
        const id = generateUUID();
        ep.addEventListener("message", function l(ev) {
            if (!ev.data || !ev.data.id || ev.data.id !== id) {
                return;
            }
            ep.removeEventListener("message", l);
            resolve(ev.data);
        });
        if (ep.start) {
            ep.start();
        }
        ep.postMessage(Object.assign({ id }, msg), transfers);
    });
}
function generateUUID() {
    return new Array(4)
        .fill(0)
        .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
        .join("-");
}


//# sourceMappingURL=comlink.mjs.map


/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "MaskGeometry": () => (/* binding */ MaskGeometry)
/* harmony export */ });
/* harmony import */ var _cc_logger__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _makeblocks__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);
/* harmony import */ var _marchingcube__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(5);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(8);
/* harmony import */ var _dosmooth__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(12);
/* harmony import */ var _normalcollector__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(47);
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }







class MaskGeometry {
  constructor(maskBuffer, imageInfo, labels) {
    this.maskBuffer = maskBuffer;
    this.imageInfo = imageInfo;
    this.labels = labels;
    this.blocks = void 0;
    this.normalCollectors = void 0;
    this.blocks = (0,_makeblocks__WEBPACK_IMPORTED_MODULE_1__.makeBlocks)(imageInfo.size);
    this.normalCollectors = labels.map(() => new _normalcollector__WEBPACK_IMPORTED_MODULE_5__.NormalCollector(imageInfo, false, this.blocks));
  }

  updateRegionBuffer(regions) {
    regions.forEach(region => {
      for (let i = 0; i < region.indexArray.length; i++) {
        this.maskBuffer[region.indexArray[i]] += region.diffArray[i];
      }
    });
  }

  updateRegionToCoarseGeometry(regions) {
    const dirtyBlocks = this.blocks.getDirtyBlocks(regions.map(r => r.region));
    _cc_logger__WEBPACK_IMPORTED_MODULE_0__.logger.time('updateRegionsBuffer');
    this.updateRegionBuffer(regions);
    _cc_logger__WEBPACK_IMPORTED_MODULE_0__.logger.timeEnd('updateRegionsBuffer');
    return this.updateCoarse(dirtyBlocks);
  }

  updateCoarse(dirtyBlocks) {
    const toBeHandledBlocks = dirtyBlocks || Array(this.blocks.getBlockCount()).fill(0).map((x, y) => x + y);
    _cc_logger__WEBPACK_IMPORTED_MODULE_0__.logger.time('updateCoarse');
    const geometries = [];
    this.labels.forEach(label => {
      geometries.push({
        label,
        geos: []
      });
    });

    const calculateBlock = blockIndex => {
      const maskIndicesVertices = (0,_marchingcube__WEBPACK_IMPORTED_MODULE_2__.default)(this.maskBuffer, this.blocks.getBlockInfoByIndex(blockIndex), _objectSpread(_objectSpread({}, this.imageInfo), {}, {
        values: this.labels
      }), (_info, label) => {
        const index = this.labels.indexOf(label);
        return this.normalCollectors[index].createLocator();
      });
      return {
        maskIndicesVertices,
        blockIndex
      };
    };

    const handledBlocks = toBeHandledBlocks.map(i => calculateBlock(i));
    handledBlocks.forEach(({
      maskIndicesVertices,
      blockIndex
    }) => {
      for (let j = 0; j < geometries.length; j++) {
        this.normalCollectors[j].updateBlock(maskIndicesVertices[j], blockIndex);
      }
    });
    handledBlocks.forEach(({
      maskIndicesVertices,
      blockIndex
    }) => {
      for (let j = 0; j < geometries.length; j++) {
        geometries[j].geos.push((0,_utils__WEBPACK_IMPORTED_MODULE_3__.makeGeometries)(this.normalCollectors[j].fillNormal(maskIndicesVertices[j]), blockIndex));
      }
    });
    _cc_logger__WEBPACK_IMPORTED_MODULE_0__.logger.timeEnd('updateCoarse');
    return geometries;
  }

  getSmoothGeometry() {
    _cc_logger__WEBPACK_IMPORTED_MODULE_0__.logger.time('extractWholeMesh');
    const maskIndicesVertices = this.normalCollectors.map(c => c.extractWholeMesh());
    _cc_logger__WEBPACK_IMPORTED_MODULE_0__.logger.timeEnd('extractWholeMesh');
    const geos = (0,_dosmooth__WEBPACK_IMPORTED_MODULE_4__.default)(maskIndicesVertices);
    return geos.map((geo, index) => {
      const {
        vertices,
        indices
      } = geo;
      const trianglesCount = indices.length / 4;
      const newIndices = new Uint32Array(trianglesCount * 3);
      let i0 = 1;
      let i1 = 0;

      for (let i = 0; i < trianglesCount; i++) {
        newIndices[i1++] = indices[i0++];
        newIndices[i1++] = indices[i0++];
        newIndices[i1++] = indices[i0++];
        i0++;
      }

      return {
        label: this.labels[index],
        subGeos: (0,_utils__WEBPACK_IMPORTED_MODULE_3__.normalMesh)({
          vertices: new Float32Array(vertices),
          indices: newIndices
        })
      };
    });
  }

}

/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "logger": () => (/* binding */ logger)
/* harmony export */ });
const logger = console;


//# sourceMappingURL=logger.es5.js.map


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "makeBlocks": () => (/* binding */ makeBlocks)
/* harmony export */ });
/* harmony import */ var _cc_logger__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const makeBlocks = (dims, cellSize = 64) => {
  const blockSize = dims.map(size => Math.ceil(size / cellSize));
  const blockCount = blockSize[0] * blockSize[1] * blockSize[2];
  const blockInfo = Array(blockCount); // i, j, k visit blockInfo[i, j, k];

  const rowBlockSize = blockSize[0];
  const sliceBlockSize = blockSize[0] * blockSize[1];

  const indexFromIJK = (i, j, k) => sliceBlockSize * k + rowBlockSize * j + i;

  const getBlockInfo = (i, j, k) => blockInfo[indexFromIJK(i, j, k)];

  for (let i = 0; i < blockSize[0]; i++) {
    for (let j = 0; j < blockSize[1]; j++) {
      for (let k = 0; k < blockSize[2]; k++) {
        const blockIndex = indexFromIJK(i, j, k);
        const index = [cellSize * i, cellSize * j, cellSize * k];
        blockInfo[blockIndex] = {
          index,
          size: [Math.min(cellSize, dims[0] - index[0] - 1), Math.min(cellSize, dims[1] - index[1] - 1), Math.min(cellSize, dims[2] - index[2] - 1)]
        };
      }
    }
  }

  const posToBlock = pos => Math.floor(pos / cellSize);

  const getDirtyBlocks = dirtyRegions => {
    _cc_logger__WEBPACK_IMPORTED_MODULE_0__.logger.time('getDirtyBlocks');
    const dirtySet = new Set();
    dirtyRegions.forEach(region => {
      for (let i = posToBlock(Math.max(0, region.index[0] - 1)); i <= posToBlock(Math.min(dims[0] - 1, region.index[0] + region.size[0] + 1)); i++) {
        for (let j = posToBlock(Math.max(0, region.index[1] - 1)); j <= posToBlock(Math.min(dims[1] - 1, region.index[1] + region.size[1] + 1)); j++) {
          for (let k = posToBlock(Math.max(0, region.index[2] - 1)); k <= posToBlock(Math.min(dims[2] - 1, region.index[2] + region.size[2] + 1)); k++) {
            dirtySet.add(indexFromIJK(i, j, k));
          }
        }
      }
    });
    const l = [];
    dirtySet.forEach(idx => l.push(idx));
    _cc_logger__WEBPACK_IMPORTED_MODULE_0__.logger.timeEnd('getDirtyBlocks');
    return l;
  };

  return {
    getBlockInfoByIJK: getBlockInfo,
    getBlockInfoByIndex: i => blockInfo[i],
    getBlockCount: () => blockCount,
    getDirtyBlocks,
    getBlockInfos: () => blockInfo
  };
};

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _tricases__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6);
/* harmony import */ var _locator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(7);
/* eslint-disable prefer-destructuring */


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((buffer, region, options, inCreateLocator) => {
  const scalars = buffer;
  const {
    origin,
    spacing,
    size
  } = options;
  const dims = size;
  const {
    values
  } = options;
  const numValues = values && values.length;
  const createLocator = inCreateLocator || _locator__WEBPACK_IMPORTED_MODULE_1__.createLocator;
  let value = 0;
  let i = 0;
  let j = 0;
  let k = 0;
  let sliceSize = 0;
  let rowSize = 0;
  const CASE_MASK = [1, 2, 4, 8, 16, 32, 64, 128];
  let triCase = null;
  let edge = null;
  let ii = 0;
  let index = 0;
  let vert = null;
  let contNum = 0;
  let jOffset = 0;
  let kOffset = 0;
  let idx = 0;
  let t = 0;
  let x1 = null;
  let x2 = null;
  const pts = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  let xp = 0;
  let yp = 0;
  let zp = 0;
  let min = 0;
  let max = 0; //  double t, *x1, *x2, x[3], min, max;
  //  double pts[8][3], xp, yp, zp;

  const edges = [[0, 1], [1, 2], [3, 2], [0, 3], [4, 5], [5, 6], [7, 6], [4, 7], [0, 4], [1, 5], [3, 7], [2, 6]]; //
  // Get min/max contour values
  //

  if ((values == null || values.length) < 1) {
    throw new Error('values.length must > 0');
  }

  min = values[0];
  max = values[0];

  for (i = 1; i < values.length; i++) {
    if (values[i] < min) {
      min = values[i];
    }

    if (values[i] > max) {
      max = values[i];
    }
  }

  const geometries = values.map(label => createLocator(options, label)); //
  // Traverse all voxel cells, generating triangles
  // using marching cubes algorithm.
  //

  rowSize = dims[0];
  sliceSize = rowSize * dims[1]; //  for ( k=0; k < (dims[2]-1); k++)

  for (k = region.index[2]; k < region.index[2] + region.size[2]; k++) {
    kOffset = k * sliceSize;
    pts[0][2] = origin[2] + k * spacing[2];
    zp = pts[0][2] + spacing[2]; //    for ( j=0; j < (dims[1]-1); j++)

    for (j = region.index[1]; j < region.index[1] + region.size[1]; j++) {
      jOffset = j * rowSize;
      pts[0][1] = origin[1] + j * spacing[1];
      yp = pts[0][1] + spacing[1];
      const dim0 = region.index[0] + region.size[0];

      for (i = region.index[0]; i < dim0; i++) {
        // get scalar values
        idx = i + jOffset + kOffset;

        if (scalars[idx] < min && scalars[idx + 1] < min && scalars[idx + 1 + dims[0]] < min && scalars[idx + dims[0]] < min && scalars[idx + sliceSize] < min && scalars[idx + 1 + sliceSize] < min && scalars[idx + 1 + dims[0] + sliceSize] < min && scalars[idx + dims[0] + sliceSize] < min || scalars[idx] > max && scalars[idx + 1] > max && scalars[idx + 1 + dims[0]] > max && scalars[idx + dims[0]] > max && scalars[idx + sliceSize] > max && scalars[idx + 1 + sliceSize] > max && scalars[idx + 1 + dims[0] + sliceSize] > max && scalars[idx + dims[0] + sliceSize] > max) {
          continue; // eslint-disable-line
        } // create voxel points


        pts[0][0] = origin[0] + i * spacing[0];
        xp = pts[0][0] + spacing[0];
        pts[1][0] = xp;
        pts[1][1] = pts[0][1];
        pts[1][2] = pts[0][2];
        pts[2][0] = xp;
        pts[2][1] = yp;
        pts[2][2] = pts[0][2];
        pts[3][0] = pts[0][0];
        pts[3][1] = yp;
        pts[3][2] = pts[0][2];
        pts[4][0] = pts[0][0];
        pts[4][1] = pts[0][1];
        pts[4][2] = zp;
        pts[5][0] = xp;
        pts[5][1] = pts[0][1];
        pts[5][2] = zp;
        pts[6][0] = xp;
        pts[6][1] = yp;
        pts[6][2] = zp;
        pts[7][0] = pts[0][0];
        pts[7][1] = yp;
        pts[7][2] = zp;

        for (contNum = 0; contNum < numValues; contNum++) {
          value = values[contNum];
          index = 0; // Build the case table

          if (scalars[idx] === value) {
            index |= CASE_MASK[0]; // eslint-disable-line no-bitwise
          }

          if (scalars[idx + 1] === value) {
            index |= CASE_MASK[1]; // eslint-disable-line no-bitwise
          }

          if (scalars[idx + 1 + dims[0]] === value) {
            index |= CASE_MASK[2]; // eslint-disable-line no-bitwise
          }

          if (scalars[idx + dims[0]] === value) {
            index |= CASE_MASK[3]; // eslint-disable-line no-bitwise
          }

          if (scalars[idx + sliceSize] === value) {
            index |= CASE_MASK[4]; // eslint-disable-line no-bitwise
          }

          if (scalars[idx + 1 + sliceSize] === value) {
            index |= CASE_MASK[5]; // eslint-disable-line no-bitwise
          }

          if (scalars[idx + 1 + dims[0] + sliceSize] === value) {
            index |= CASE_MASK[6]; // eslint-disable-line no-bitwise
          }

          if (scalars[idx + dims[0] + sliceSize] === value) {
            index |= CASE_MASK[7]; // eslint-disable-line no-bitwise
          }

          if (index === 0 || index === 255) {
            // no surface
            continue; // eslint-disable-line
          }

          triCase = _tricases__WEBPACK_IMPORTED_MODULE_0__.default[index];
          edge = 0;
          const locator = geometries[contNum];

          for (; triCase[edge] > -1; edge += 3) {
            const tris = [];

            for (ii = 0; ii < 3; ii++) {
              // insert triangle
              vert = edges[triCase[edge + ii]]; // for discrete marching cubes, the interpolation point
              // is always 0.5.

              t = 0.5;
              x1 = pts[vert[0]];
              x2 = pts[vert[1]];
              tris.push([x1[0] + t * (x2[0] - x1[0]), x1[1] + t * (x2[1] - x1[1]), x1[2] + t * (x2[2] - x1[2])]);
            }

            locator.insertTriangles(tris);
          } // for each triangle

        } // for all contours

      } // for i

    } // for j

  } // for k


  return geometries.map(g => g.getValue());
});

/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const vtkMarchingCubesTriangleCases = [[-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 0 0 */
, [0, 3, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 1 1 */
, [0, 9, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 2 1 */
, [1, 3, 8, 9, 1, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 3 2 */
, [1, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 4 1 */
, [0, 3, 8, 1, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 5 3 */
, [9, 11, 2, 0, 9, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 6 2 */
, [2, 3, 8, 2, 8, 11, 11, 8, 9, -1, -1, -1, -1, -1, -1, -1]
/* 7 5 */
, [3, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 8 1 */
, [0, 2, 10, 8, 0, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 9 2 */
, [1, 0, 9, 2, 10, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 10 3 */
, [1, 2, 10, 1, 10, 9, 9, 10, 8, -1, -1, -1, -1, -1, -1, -1]
/* 11 5 */
, [3, 1, 11, 10, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 12 2 */
, [0, 1, 11, 0, 11, 8, 8, 11, 10, -1, -1, -1, -1, -1, -1, -1]
/* 13 5 */
, [3, 0, 9, 3, 9, 10, 10, 9, 11, -1, -1, -1, -1, -1, -1, -1]
/* 14 5 */
, [9, 11, 8, 11, 10, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 15 8 */
, [4, 8, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 16 1 */
, [4, 0, 3, 7, 4, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 17 2 */
, [0, 9, 1, 8, 7, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 18 3 */
, [4, 9, 1, 4, 1, 7, 7, 1, 3, -1, -1, -1, -1, -1, -1, -1]
/* 19 5 */
, [1, 11, 2, 8, 7, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 20 4 */
, [3, 7, 4, 3, 4, 0, 1, 11, 2, -1, -1, -1, -1, -1, -1, -1]
/* 21 7 */
, [9, 11, 2, 9, 2, 0, 8, 7, 4, -1, -1, -1, -1, -1, -1, -1]
/* 22 7 */
, [2, 9, 11, 2, 7, 9, 2, 3, 7, 7, 4, 9, -1, -1, -1, -1]
/* 23 14 */
, [8, 7, 4, 3, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 24 3 */
, [10, 7, 4, 10, 4, 2, 2, 4, 0, -1, -1, -1, -1, -1, -1, -1]
/* 25 5 */
, [9, 1, 0, 8, 7, 4, 2, 10, 3, -1, -1, -1, -1, -1, -1, -1]
/* 26 6 */
, [4, 10, 7, 9, 10, 4, 9, 2, 10, 9, 1, 2, -1, -1, -1, -1]
/* 27 9 */
, [3, 1, 11, 3, 11, 10, 7, 4, 8, -1, -1, -1, -1, -1, -1, -1]
/* 28 7 */
, [1, 11, 10, 1, 10, 4, 1, 4, 0, 7, 4, 10, -1, -1, -1, -1]
/* 29 11 */
, [4, 8, 7, 9, 10, 0, 9, 11, 10, 10, 3, 0, -1, -1, -1, -1]
/* 30 12 */
, [4, 10, 7, 4, 9, 10, 9, 11, 10, -1, -1, -1, -1, -1, -1, -1]
/* 31 5 */
, [9, 4, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 32 1 */
, [9, 4, 5, 0, 3, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 33 3 */
, [0, 4, 5, 1, 0, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 34 2 */
, [8, 4, 5, 8, 5, 3, 3, 5, 1, -1, -1, -1, -1, -1, -1, -1]
/* 35 5 */
, [1, 11, 2, 9, 4, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 36 3 */
, [3, 8, 0, 1, 11, 2, 4, 5, 9, -1, -1, -1, -1, -1, -1, -1]
/* 37 6 */
, [5, 11, 2, 5, 2, 4, 4, 2, 0, -1, -1, -1, -1, -1, -1, -1]
/* 38 5 */
, [2, 5, 11, 3, 5, 2, 3, 4, 5, 3, 8, 4, -1, -1, -1, -1]
/* 39 9 */
, [9, 4, 5, 2, 10, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 40 4 */
, [0, 2, 10, 0, 10, 8, 4, 5, 9, -1, -1, -1, -1, -1, -1, -1]
/* 41 7 */
, [0, 4, 5, 0, 5, 1, 2, 10, 3, -1, -1, -1, -1, -1, -1, -1]
/* 42 7 */
, [2, 5, 1, 2, 8, 5, 2, 10, 8, 4, 5, 8, -1, -1, -1, -1]
/* 43 11 */
, [11, 10, 3, 11, 3, 1, 9, 4, 5, -1, -1, -1, -1, -1, -1, -1]
/* 44 7 */
, [4, 5, 9, 0, 1, 8, 8, 1, 11, 8, 11, 10, -1, -1, -1, -1]
/* 45 12 */
, [5, 0, 4, 5, 10, 0, 5, 11, 10, 10, 3, 0, -1, -1, -1, -1]
/* 46 14 */
, [5, 8, 4, 5, 11, 8, 11, 10, 8, -1, -1, -1, -1, -1, -1, -1]
/* 47 5 */
, [9, 8, 7, 5, 9, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 48 2 */
, [9, 0, 3, 9, 3, 5, 5, 3, 7, -1, -1, -1, -1, -1, -1, -1]
/* 49 5 */
, [0, 8, 7, 0, 7, 1, 1, 7, 5, -1, -1, -1, -1, -1, -1, -1]
/* 50 5 */
, [1, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 51 8 */
, [9, 8, 7, 9, 7, 5, 11, 2, 1, -1, -1, -1, -1, -1, -1, -1]
/* 52 7 */
, [11, 2, 1, 9, 0, 5, 5, 0, 3, 5, 3, 7, -1, -1, -1, -1]
/* 53 12 */
, [8, 2, 0, 8, 5, 2, 8, 7, 5, 11, 2, 5, -1, -1, -1, -1]
/* 54 11 */
, [2, 5, 11, 2, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1]
/* 55 5 */
, [7, 5, 9, 7, 9, 8, 3, 2, 10, -1, -1, -1, -1, -1, -1, -1]
/* 56 7 */
, [9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 10, 7, -1, -1, -1, -1]
/* 57 14 */
, [2, 10, 3, 0, 8, 1, 1, 8, 7, 1, 7, 5, -1, -1, -1, -1]
/* 58 12 */
, [10, 1, 2, 10, 7, 1, 7, 5, 1, -1, -1, -1, -1, -1, -1, -1]
/* 59 5 */
, [9, 8, 5, 8, 7, 5, 11, 3, 1, 11, 10, 3, -1, -1, -1, -1]
/* 60 10 */
, [5, 0, 7, 5, 9, 0, 7, 0, 10, 1, 11, 0, 10, 0, 11, -1]
/* 61 7 */
, [10, 0, 11, 10, 3, 0, 11, 0, 5, 8, 7, 0, 5, 0, 7, -1]
/* 62 7 */
, [10, 5, 11, 7, 5, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 63 2 */
, [11, 5, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 64 1 */
, [0, 3, 8, 5, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 65 4 */
, [9, 1, 0, 5, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 66 3 */
, [1, 3, 8, 1, 8, 9, 5, 6, 11, -1, -1, -1, -1, -1, -1, -1]
/* 67 7 */
, [1, 5, 6, 2, 1, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 68 2 */
, [1, 5, 6, 1, 6, 2, 3, 8, 0, -1, -1, -1, -1, -1, -1, -1]
/* 69 7 */
, [9, 5, 6, 9, 6, 0, 0, 6, 2, -1, -1, -1, -1, -1, -1, -1]
/* 70 5 */
, [5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, -1, -1, -1, -1]
/* 71 11 */
, [2, 10, 3, 11, 5, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 72 3 */
, [10, 8, 0, 10, 0, 2, 11, 5, 6, -1, -1, -1, -1, -1, -1, -1]
/* 73 7 */
, [0, 9, 1, 2, 10, 3, 5, 6, 11, -1, -1, -1, -1, -1, -1, -1]
/* 74 6 */
, [5, 6, 11, 1, 2, 9, 9, 2, 10, 9, 10, 8, -1, -1, -1, -1]
/* 75 12 */
, [6, 10, 3, 6, 3, 5, 5, 3, 1, -1, -1, -1, -1, -1, -1, -1]
/* 76 5 */
, [0, 10, 8, 0, 5, 10, 0, 1, 5, 5, 6, 10, -1, -1, -1, -1]
/* 77 14 */
, [3, 6, 10, 0, 6, 3, 0, 5, 6, 0, 9, 5, -1, -1, -1, -1]
/* 78 9 */
, [6, 9, 5, 6, 10, 9, 10, 8, 9, -1, -1, -1, -1, -1, -1, -1]
/* 79 5 */
, [5, 6, 11, 4, 8, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 80 3 */
, [4, 0, 3, 4, 3, 7, 6, 11, 5, -1, -1, -1, -1, -1, -1, -1]
/* 81 7 */
, [1, 0, 9, 5, 6, 11, 8, 7, 4, -1, -1, -1, -1, -1, -1, -1]
/* 82 6 */
, [11, 5, 6, 1, 7, 9, 1, 3, 7, 7, 4, 9, -1, -1, -1, -1]
/* 83 12 */
, [6, 2, 1, 6, 1, 5, 4, 8, 7, -1, -1, -1, -1, -1, -1, -1]
/* 84 7 */
, [1, 5, 2, 5, 6, 2, 3, 4, 0, 3, 7, 4, -1, -1, -1, -1]
/* 85 10 */
, [8, 7, 4, 9, 5, 0, 0, 5, 6, 0, 6, 2, -1, -1, -1, -1]
/* 86 12 */
, [7, 9, 3, 7, 4, 9, 3, 9, 2, 5, 6, 9, 2, 9, 6, -1]
/* 87 7 */
, [3, 2, 10, 7, 4, 8, 11, 5, 6, -1, -1, -1, -1, -1, -1, -1]
/* 88 6 */
, [5, 6, 11, 4, 2, 7, 4, 0, 2, 2, 10, 7, -1, -1, -1, -1]
/* 89 12 */
, [0, 9, 1, 4, 8, 7, 2, 10, 3, 5, 6, 11, -1, -1, -1, -1]
/* 90 13 */
, [9, 1, 2, 9, 2, 10, 9, 10, 4, 7, 4, 10, 5, 6, 11, -1]
/* 91 6 */
, [8, 7, 4, 3, 5, 10, 3, 1, 5, 5, 6, 10, -1, -1, -1, -1]
/* 92 12 */
, [5, 10, 1, 5, 6, 10, 1, 10, 0, 7, 4, 10, 0, 10, 4, -1]
/* 93 7 */
, [0, 9, 5, 0, 5, 6, 0, 6, 3, 10, 3, 6, 8, 7, 4, -1]
/* 94 6 */
, [6, 9, 5, 6, 10, 9, 4, 9, 7, 7, 9, 10, -1, -1, -1, -1]
/* 95 3 */
, [11, 9, 4, 6, 11, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 96 2 */
, [4, 6, 11, 4, 11, 9, 0, 3, 8, -1, -1, -1, -1, -1, -1, -1]
/* 97 7 */
, [11, 1, 0, 11, 0, 6, 6, 0, 4, -1, -1, -1, -1, -1, -1, -1]
/* 98 5 */
, [8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 11, 1, -1, -1, -1, -1]
/* 99 14 */
, [1, 9, 4, 1, 4, 2, 2, 4, 6, -1, -1, -1, -1, -1, -1, -1]
/* 100 5 */
, [3, 8, 0, 1, 9, 2, 2, 9, 4, 2, 4, 6, -1, -1, -1, -1]
/* 101 12 */
, [0, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 102 8 */
, [8, 2, 3, 8, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1]
/* 103 5 */
, [11, 9, 4, 11, 4, 6, 10, 3, 2, -1, -1, -1, -1, -1, -1, -1]
/* 104 7 */
, [0, 2, 8, 2, 10, 8, 4, 11, 9, 4, 6, 11, -1, -1, -1, -1]
/* 105 10 */
, [3, 2, 10, 0, 6, 1, 0, 4, 6, 6, 11, 1, -1, -1, -1, -1]
/* 106 12 */
, [6, 1, 4, 6, 11, 1, 4, 1, 8, 2, 10, 1, 8, 1, 10, -1]
/* 107 7 */
, [9, 4, 6, 9, 6, 3, 9, 3, 1, 10, 3, 6, -1, -1, -1, -1]
/* 108 11 */
, [8, 1, 10, 8, 0, 1, 10, 1, 6, 9, 4, 1, 6, 1, 4, -1]
/* 109 7 */
, [3, 6, 10, 3, 0, 6, 0, 4, 6, -1, -1, -1, -1, -1, -1, -1]
/* 110 5 */
, [6, 8, 4, 10, 8, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 111 2 */
, [7, 6, 11, 7, 11, 8, 8, 11, 9, -1, -1, -1, -1, -1, -1, -1]
/* 112 5 */
, [0, 3, 7, 0, 7, 11, 0, 11, 9, 6, 11, 7, -1, -1, -1, -1]
/* 113 11 */
, [11, 7, 6, 1, 7, 11, 1, 8, 7, 1, 0, 8, -1, -1, -1, -1]
/* 114 9 */
, [11, 7, 6, 11, 1, 7, 1, 3, 7, -1, -1, -1, -1, -1, -1, -1]
/* 115 5 */
, [1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, -1, -1, -1, -1]
/* 116 14 */
, [2, 9, 6, 2, 1, 9, 6, 9, 7, 0, 3, 9, 7, 9, 3, -1]
/* 117 7 */
, [7, 0, 8, 7, 6, 0, 6, 2, 0, -1, -1, -1, -1, -1, -1, -1]
/* 118 5 */
, [7, 2, 3, 6, 2, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 119 2 */
, [2, 10, 3, 11, 8, 6, 11, 9, 8, 8, 7, 6, -1, -1, -1, -1]
/* 120 12 */
, [2, 7, 0, 2, 10, 7, 0, 7, 9, 6, 11, 7, 9, 7, 11, -1]
/* 121 7 */
, [1, 0, 8, 1, 8, 7, 1, 7, 11, 6, 11, 7, 2, 10, 3, -1]
/* 122 6 */
, [10, 1, 2, 10, 7, 1, 11, 1, 6, 6, 1, 7, -1, -1, -1, -1]
/* 123 3 */
, [8, 6, 9, 8, 7, 6, 9, 6, 1, 10, 3, 6, 1, 6, 3, -1]
/* 124 7 */
, [0, 1, 9, 10, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 125 4 */
, [7, 0, 8, 7, 6, 0, 3, 0, 10, 10, 0, 6, -1, -1, -1, -1]
/* 126 3 */
, [7, 6, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 127 1 */
, [7, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 128 1 */
, [3, 8, 0, 10, 6, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 129 3 */
, [0, 9, 1, 10, 6, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 130 4 */
, [8, 9, 1, 8, 1, 3, 10, 6, 7, -1, -1, -1, -1, -1, -1, -1]
/* 131 7 */
, [11, 2, 1, 6, 7, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 132 3 */
, [1, 11, 2, 3, 8, 0, 6, 7, 10, -1, -1, -1, -1, -1, -1, -1]
/* 133 6 */
, [2, 0, 9, 2, 9, 11, 6, 7, 10, -1, -1, -1, -1, -1, -1, -1]
/* 134 7 */
, [6, 7, 10, 2, 3, 11, 11, 3, 8, 11, 8, 9, -1, -1, -1, -1]
/* 135 12 */
, [7, 3, 2, 6, 7, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 136 2 */
, [7, 8, 0, 7, 0, 6, 6, 0, 2, -1, -1, -1, -1, -1, -1, -1]
/* 137 5 */
, [2, 6, 7, 2, 7, 3, 0, 9, 1, -1, -1, -1, -1, -1, -1, -1]
/* 138 7 */
, [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, -1, -1, -1, -1]
/* 139 14 */
, [11, 6, 7, 11, 7, 1, 1, 7, 3, -1, -1, -1, -1, -1, -1, -1]
/* 140 5 */
, [11, 6, 7, 1, 11, 7, 1, 7, 8, 1, 8, 0, -1, -1, -1, -1]
/* 141 9 */
, [0, 7, 3, 0, 11, 7, 0, 9, 11, 6, 7, 11, -1, -1, -1, -1]
/* 142 11 */
, [7, 11, 6, 7, 8, 11, 8, 9, 11, -1, -1, -1, -1, -1, -1, -1]
/* 143 5 */
, [6, 4, 8, 10, 6, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 144 2 */
, [3, 10, 6, 3, 6, 0, 0, 6, 4, -1, -1, -1, -1, -1, -1, -1]
/* 145 5 */
, [8, 10, 6, 8, 6, 4, 9, 1, 0, -1, -1, -1, -1, -1, -1, -1]
/* 146 7 */
, [9, 6, 4, 9, 3, 6, 9, 1, 3, 10, 6, 3, -1, -1, -1, -1]
/* 147 11 */
, [6, 4, 8, 6, 8, 10, 2, 1, 11, -1, -1, -1, -1, -1, -1, -1]
/* 148 7 */
, [1, 11, 2, 3, 10, 0, 0, 10, 6, 0, 6, 4, -1, -1, -1, -1]
/* 149 12 */
, [4, 8, 10, 4, 10, 6, 0, 9, 2, 2, 9, 11, -1, -1, -1, -1]
/* 150 10 */
, [11, 3, 9, 11, 2, 3, 9, 3, 4, 10, 6, 3, 4, 3, 6, -1]
/* 151 7 */
, [8, 3, 2, 8, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1]
/* 152 5 */
, [0, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 153 8 */
, [1, 0, 9, 2, 4, 3, 2, 6, 4, 4, 8, 3, -1, -1, -1, -1]
/* 154 12 */
, [1, 4, 9, 1, 2, 4, 2, 6, 4, -1, -1, -1, -1, -1, -1, -1]
/* 155 5 */
, [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 11, -1, -1, -1, -1]
/* 156 14 */
, [11, 0, 1, 11, 6, 0, 6, 4, 0, -1, -1, -1, -1, -1, -1, -1]
/* 157 5 */
, [4, 3, 6, 4, 8, 3, 6, 3, 11, 0, 9, 3, 11, 3, 9, -1]
/* 158 7 */
, [11, 4, 9, 6, 4, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 159 2 */
, [4, 5, 9, 7, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 160 3 */
, [0, 3, 8, 4, 5, 9, 10, 6, 7, -1, -1, -1, -1, -1, -1, -1]
/* 161 6 */
, [5, 1, 0, 5, 0, 4, 7, 10, 6, -1, -1, -1, -1, -1, -1, -1]
/* 162 7 */
, [10, 6, 7, 8, 4, 3, 3, 4, 5, 3, 5, 1, -1, -1, -1, -1]
/* 163 12 */
, [9, 4, 5, 11, 2, 1, 7, 10, 6, -1, -1, -1, -1, -1, -1, -1]
/* 164 6 */
, [6, 7, 10, 1, 11, 2, 0, 3, 8, 4, 5, 9, -1, -1, -1, -1]
/* 165 13 */
, [7, 10, 6, 5, 11, 4, 4, 11, 2, 4, 2, 0, -1, -1, -1, -1]
/* 166 12 */
, [3, 8, 4, 3, 4, 5, 3, 5, 2, 11, 2, 5, 10, 6, 7, -1]
/* 167 6 */
, [7, 3, 2, 7, 2, 6, 5, 9, 4, -1, -1, -1, -1, -1, -1, -1]
/* 168 7 */
, [9, 4, 5, 0, 6, 8, 0, 2, 6, 6, 7, 8, -1, -1, -1, -1]
/* 169 12 */
, [3, 2, 6, 3, 6, 7, 1, 0, 5, 5, 0, 4, -1, -1, -1, -1]
/* 170 10 */
, [6, 8, 2, 6, 7, 8, 2, 8, 1, 4, 5, 8, 1, 8, 5, -1]
/* 171 7 */
, [9, 4, 5, 11, 6, 1, 1, 6, 7, 1, 7, 3, -1, -1, -1, -1]
/* 172 12 */
, [1, 11, 6, 1, 6, 7, 1, 7, 0, 8, 0, 7, 9, 4, 5, -1]
/* 173 6 */
, [4, 11, 0, 4, 5, 11, 0, 11, 3, 6, 7, 11, 3, 11, 7, -1]
/* 174 7 */
, [7, 11, 6, 7, 8, 11, 5, 11, 4, 4, 11, 8, -1, -1, -1, -1]
/* 175 3 */
, [6, 5, 9, 6, 9, 10, 10, 9, 8, -1, -1, -1, -1, -1, -1, -1]
/* 176 5 */
, [3, 10, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, -1, -1, -1, -1]
/* 177 9 */
, [0, 8, 10, 0, 10, 5, 0, 5, 1, 5, 10, 6, -1, -1, -1, -1]
/* 178 14 */
, [6, 3, 10, 6, 5, 3, 5, 1, 3, -1, -1, -1, -1, -1, -1, -1]
/* 179 5 */
, [1, 11, 2, 9, 10, 5, 9, 8, 10, 10, 6, 5, -1, -1, -1, -1]
/* 180 12 */
, [0, 3, 10, 0, 10, 6, 0, 6, 9, 5, 9, 6, 1, 11, 2, -1]
/* 181 6 */
, [10, 5, 8, 10, 6, 5, 8, 5, 0, 11, 2, 5, 0, 5, 2, -1]
/* 182 7 */
, [6, 3, 10, 6, 5, 3, 2, 3, 11, 11, 3, 5, -1, -1, -1, -1]
/* 183 3 */
, [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, -1, -1, -1, -1]
/* 184 11 */
, [9, 6, 5, 9, 0, 6, 0, 2, 6, -1, -1, -1, -1, -1, -1, -1]
/* 185 5 */
, [1, 8, 5, 1, 0, 8, 5, 8, 6, 3, 2, 8, 6, 8, 2, -1]
/* 186 7 */
, [1, 6, 5, 2, 6, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 187 2 */
, [1, 6, 3, 1, 11, 6, 3, 6, 8, 5, 9, 6, 8, 6, 9, -1]
/* 188 7 */
, [11, 0, 1, 11, 6, 0, 9, 0, 5, 5, 0, 6, -1, -1, -1, -1]
/* 189 3 */
, [0, 8, 3, 5, 11, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 190 4 */
, [11, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 191 1 */
, [10, 11, 5, 7, 10, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 192 2 */
, [10, 11, 5, 10, 5, 7, 8, 0, 3, -1, -1, -1, -1, -1, -1, -1]
/* 193 7 */
, [5, 7, 10, 5, 10, 11, 1, 0, 9, -1, -1, -1, -1, -1, -1, -1]
/* 194 7 */
, [11, 5, 7, 11, 7, 10, 9, 1, 8, 8, 1, 3, -1, -1, -1, -1]
/* 195 10 */
, [10, 2, 1, 10, 1, 7, 7, 1, 5, -1, -1, -1, -1, -1, -1, -1]
/* 196 5 */
, [0, 3, 8, 1, 7, 2, 1, 5, 7, 7, 10, 2, -1, -1, -1, -1]
/* 197 12 */
, [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 10, -1, -1, -1, -1]
/* 198 14 */
, [7, 2, 5, 7, 10, 2, 5, 2, 9, 3, 8, 2, 9, 2, 8, -1]
/* 199 7 */
, [2, 11, 5, 2, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1]
/* 200 5 */
, [8, 0, 2, 8, 2, 5, 8, 5, 7, 11, 5, 2, -1, -1, -1, -1]
/* 201 11 */
, [9, 1, 0, 5, 3, 11, 5, 7, 3, 3, 2, 11, -1, -1, -1, -1]
/* 202 12 */
, [9, 2, 8, 9, 1, 2, 8, 2, 7, 11, 5, 2, 7, 2, 5, -1]
/* 203 7 */
, [1, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 204 8 */
, [0, 7, 8, 0, 1, 7, 1, 5, 7, -1, -1, -1, -1, -1, -1, -1]
/* 205 5 */
, [9, 3, 0, 9, 5, 3, 5, 7, 3, -1, -1, -1, -1, -1, -1, -1]
/* 206 5 */
, [9, 7, 8, 5, 7, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 207 2 */
, [5, 4, 8, 5, 8, 11, 11, 8, 10, -1, -1, -1, -1, -1, -1, -1]
/* 208 5 */
, [5, 4, 0, 5, 0, 10, 5, 10, 11, 10, 0, 3, -1, -1, -1, -1]
/* 209 14 */
, [0, 9, 1, 8, 11, 4, 8, 10, 11, 11, 5, 4, -1, -1, -1, -1]
/* 210 12 */
, [11, 4, 10, 11, 5, 4, 10, 4, 3, 9, 1, 4, 3, 4, 1, -1]
/* 211 7 */
, [2, 1, 5, 2, 5, 8, 2, 8, 10, 4, 8, 5, -1, -1, -1, -1]
/* 212 11 */
, [0, 10, 4, 0, 3, 10, 4, 10, 5, 2, 1, 10, 5, 10, 1, -1]
/* 213 7 */
, [0, 5, 2, 0, 9, 5, 2, 5, 10, 4, 8, 5, 10, 5, 8, -1]
/* 214 7 */
, [9, 5, 4, 2, 3, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 215 4 */
, [2, 11, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, -1, -1, -1, -1]
/* 216 9 */
, [5, 2, 11, 5, 4, 2, 4, 0, 2, -1, -1, -1, -1, -1, -1, -1]
/* 217 5 */
, [3, 2, 11, 3, 11, 5, 3, 5, 8, 4, 8, 5, 0, 9, 1, -1]
/* 218 6 */
, [5, 2, 11, 5, 4, 2, 1, 2, 9, 9, 2, 4, -1, -1, -1, -1]
/* 219 3 */
, [8, 5, 4, 8, 3, 5, 3, 1, 5, -1, -1, -1, -1, -1, -1, -1]
/* 220 5 */
, [0, 5, 4, 1, 5, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 221 2 */
, [8, 5, 4, 8, 3, 5, 9, 5, 0, 0, 5, 3, -1, -1, -1, -1]
/* 222 3 */
, [9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 223 1 */
, [4, 7, 10, 4, 10, 9, 9, 10, 11, -1, -1, -1, -1, -1, -1, -1]
/* 224 5 */
, [0, 3, 8, 4, 7, 9, 9, 7, 10, 9, 10, 11, -1, -1, -1, -1]
/* 225 12 */
, [1, 10, 11, 1, 4, 10, 1, 0, 4, 7, 10, 4, -1, -1, -1, -1]
/* 226 11 */
, [3, 4, 1, 3, 8, 4, 1, 4, 11, 7, 10, 4, 11, 4, 10, -1]
/* 227 7 */
, [4, 7, 10, 9, 4, 10, 9, 10, 2, 9, 2, 1, -1, -1, -1, -1]
/* 228 9 */
, [9, 4, 7, 9, 7, 10, 9, 10, 1, 2, 1, 10, 0, 3, 8, -1]
/* 229 6 */
, [10, 4, 7, 10, 2, 4, 2, 0, 4, -1, -1, -1, -1, -1, -1, -1]
/* 230 5 */
, [10, 4, 7, 10, 2, 4, 8, 4, 3, 3, 4, 2, -1, -1, -1, -1]
/* 231 3 */
, [2, 11, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, -1, -1, -1, -1]
/* 232 14 */
, [9, 7, 11, 9, 4, 7, 11, 7, 2, 8, 0, 7, 2, 7, 0, -1]
/* 233 7 */
, [3, 11, 7, 3, 2, 11, 7, 11, 4, 1, 0, 11, 4, 11, 0, -1]
/* 234 7 */
, [1, 2, 11, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 235 4 */
, [4, 1, 9, 4, 7, 1, 7, 3, 1, -1, -1, -1, -1, -1, -1, -1]
/* 236 5 */
, [4, 1, 9, 4, 7, 1, 0, 1, 8, 8, 1, 7, -1, -1, -1, -1]
/* 237 3 */
, [4, 3, 0, 7, 3, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 238 2 */
, [4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 239 1 */
, [9, 8, 11, 11, 8, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 240 8 */
, [3, 9, 0, 3, 10, 9, 10, 11, 9, -1, -1, -1, -1, -1, -1, -1]
/* 241 5 */
, [0, 11, 1, 0, 8, 11, 8, 10, 11, -1, -1, -1, -1, -1, -1, -1]
/* 242 5 */
, [3, 11, 1, 10, 11, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 243 2 */
, [1, 10, 2, 1, 9, 10, 9, 8, 10, -1, -1, -1, -1, -1, -1, -1]
/* 244 5 */
, [3, 9, 0, 3, 10, 9, 1, 9, 2, 2, 9, 10, -1, -1, -1, -1]
/* 245 3 */
, [0, 10, 2, 8, 10, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 246 2 */
, [3, 10, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 247 1 */
, [2, 8, 3, 2, 11, 8, 11, 9, 8, -1, -1, -1, -1, -1, -1, -1]
/* 248 5 */
, [9, 2, 11, 0, 2, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 249 2 */
, [2, 8, 3, 2, 11, 8, 0, 8, 1, 1, 8, 11, -1, -1, -1, -1]
/* 250 3 */
, [1, 2, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 251 1 */
, [1, 8, 3, 9, 8, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 252 2 */
, [0, 1, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 253 1 */
, [0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
/* 254 1 */
, [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]];
/* 255 0 */

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (vtkMarchingCubesTriangleCases);

/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createLocator": () => (/* binding */ createLocator)
/* harmony export */ });
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const createLocator = () => {
  const indices = [];
  const vertices = [];
  let index = 0;

  const insertTriangles = ([p0, p1, p2]) => {
    vertices.push(p0[0]);
    vertices.push(p0[1]);
    vertices.push(p0[2]);
    vertices.push(p1[0]);
    vertices.push(p1[1]);
    vertices.push(p1[2]);
    vertices.push(p2[0]);
    vertices.push(p2[1]);
    vertices.push(p2[2]);
    indices.push(index);
    indices.push(index + 1);
    indices.push(index + 2);
    index += 3;
  };

  const getValue = () => ({
    indices,
    vertices
  });

  return {
    insertTriangles,
    getValue
  };
};



/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "normalMesh": () => (/* binding */ normalMesh),
/* harmony export */   "makeGeometries": () => (/* binding */ makeGeometries)
/* harmony export */ });
/* harmony import */ var gl_matrix__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(10);
/* harmony import */ var _base_splitgeometries__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9);
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




const generateNormals = mesh => {
  const indexArray = mesh.indices;
  const vertexData = mesh.vertices;
  const normalArray = new Float32Array(vertexData.length);

  for (let i = 0; i < indexArray.length; i += 3) {
    const iA = indexArray[i + 0] * 3;
    const iB = indexArray[i + 1] * 3;
    const iC = indexArray[i + 2] * 3;
    const vA = [vertexData[indexArray[i] * 3 + 0], vertexData[indexArray[i] * 3 + 1], vertexData[indexArray[i] * 3 + 2]];
    const vB = [vertexData[indexArray[i + 1] * 3 + 0], vertexData[indexArray[i + 1] * 3 + 1], vertexData[indexArray[i + 1] * 3 + 2]];
    const vC = [vertexData[indexArray[i + 2] * 3 + 0], vertexData[indexArray[i + 2] * 3 + 1], vertexData[indexArray[i + 2] * 3 + 2]];
    const cb = gl_matrix__WEBPACK_IMPORTED_MODULE_1__.sub([0, 0, 0], vC, vB);
    const ab = gl_matrix__WEBPACK_IMPORTED_MODULE_1__.sub([0, 0, 0], vA, vB);
    const n = gl_matrix__WEBPACK_IMPORTED_MODULE_1__.cross([0, 0, 0], ab, cb);
    normalArray[iA + 0] += n[0];
    normalArray[iA + 1] += n[1];
    normalArray[iA + 2] += n[2];
    normalArray[iB + 0] += n[0];
    normalArray[iB + 1] += n[1];
    normalArray[iB + 2] += n[2];
    normalArray[iC + 0] += n[0];
    normalArray[iC + 1] += n[1];
    normalArray[iC + 2] += n[2];
  }

  for (let i = 0; i < normalArray.length; i += 3) {
    const n = gl_matrix__WEBPACK_IMPORTED_MODULE_1__.normalize([0, 0, 0], gl_matrix__WEBPACK_IMPORTED_MODULE_1__.fromValues(normalArray[i + 0], normalArray[i + 1], normalArray[i + 2]));
    normalArray[i + 0] = -n[0];
    normalArray[i + 1] = -n[1];
    normalArray[i + 2] = -n[2];
  }

  return normalArray;
};

const normalizeMesh = inMesh => {
  const mesh = _objectSpread({}, inMesh);

  if (mesh.normals) {
    return mesh;
  }

  mesh.normals = generateNormals(mesh);
  return mesh;
};

const normalMesh = mesh => {
  if (mesh.indices.length === 0) {
    return [];
  }

  return (0,_base_splitgeometries__WEBPACK_IMPORTED_MODULE_0__.splitGeometries)(normalizeMesh(mesh));
}; // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types


const makeGeometries = (mesh, blockIndex) => {
  const indices = mesh.vertices.length <= _base_splitgeometries__WEBPACK_IMPORTED_MODULE_0__.splitLimit * 3 ? new Uint16Array(mesh.indices) : new Uint32Array(mesh.indices);
  const vertices = new Float32Array(mesh.vertices);
  return {
    blockIndex,
    subGeos: normalMesh({
      vertices,
      indices,
      normals: mesh.normals
    })
  };
};



/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "splitLimit": () => (/* binding */ splitLimit),
/* harmony export */   "splitGeometries": () => (/* binding */ splitGeometries)
/* harmony export */ });
/* harmony import */ var _cc_logger__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);

const splitLimit = 65000;
const splitGeometries = mesh => {
  if (!mesh.normals) {
    return [mesh];
  }

  const maxSize = splitLimit;

  if (mesh.vertices.length <= maxSize * 3) {
    return [mesh];
  }

  const ret = [];

  const makeNewSession = () => ({
    vertices: [],
    indices: [],
    normals: [],
    mapping: new Map() // mapping for originIndex => currentIndex.

  });

  let session = makeNewSession();

  const addPoint = index => {
    const cachedNewIndex = session.mapping.get(index);

    if (cachedNewIndex !== undefined) {
      session.indices.push(cachedNewIndex);
      return;
    }

    const newIndex = session.vertices.length / 3;
    session.mapping.set(index, newIndex);
    session.indices.push(newIndex);
    session.vertices.push(mesh.vertices[index * 3], mesh.vertices[index * 3 + 1], mesh.vertices[index * 3 + 2]);
    session.normals.push(mesh.normals[index * 3], mesh.normals[index * 3 + 1], mesh.normals[index * 3 + 2]);
  };

  const addTriangle = (index0, index1, index2) => {
    // current session
    addPoint(index0);
    addPoint(index1);
    addPoint(index2);
  };

  _cc_logger__WEBPACK_IMPORTED_MODULE_0__.logger.time('splitgeometry');

  for (let curTriangleIndex = 0; curTriangleIndex < mesh.indices.length / 3; curTriangleIndex += 1) {
    if (session.vertices.length > splitLimit * 3) {
      ret.push({
        vertices: new Float32Array(session.vertices),
        normals: new Float32Array(session.normals),
        indices: new Uint16Array(session.indices)
      });
      session = makeNewSession();
    }

    const index0 = mesh.indices[curTriangleIndex * 3];
    const index1 = mesh.indices[curTriangleIndex * 3 + 1];
    const index2 = mesh.indices[curTriangleIndex * 3 + 2];
    addTriangle(index0, index1, index2);
  }

  ret.push({
    vertices: new Float32Array(session.vertices),
    normals: new Float32Array(session.normals),
    indices: new Uint16Array(session.indices)
  });
  _cc_logger__WEBPACK_IMPORTED_MODULE_0__.logger.timeEnd('splitgeometry');
  return ret;
};

/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "create": () => (/* binding */ create),
/* harmony export */   "clone": () => (/* binding */ clone),
/* harmony export */   "length": () => (/* binding */ length),
/* harmony export */   "fromValues": () => (/* binding */ fromValues),
/* harmony export */   "copy": () => (/* binding */ copy),
/* harmony export */   "set": () => (/* binding */ set),
/* harmony export */   "add": () => (/* binding */ add),
/* harmony export */   "subtract": () => (/* binding */ subtract),
/* harmony export */   "multiply": () => (/* binding */ multiply),
/* harmony export */   "divide": () => (/* binding */ divide),
/* harmony export */   "ceil": () => (/* binding */ ceil),
/* harmony export */   "floor": () => (/* binding */ floor),
/* harmony export */   "min": () => (/* binding */ min),
/* harmony export */   "max": () => (/* binding */ max),
/* harmony export */   "round": () => (/* binding */ round),
/* harmony export */   "scale": () => (/* binding */ scale),
/* harmony export */   "scaleAndAdd": () => (/* binding */ scaleAndAdd),
/* harmony export */   "distance": () => (/* binding */ distance),
/* harmony export */   "squaredDistance": () => (/* binding */ squaredDistance),
/* harmony export */   "squaredLength": () => (/* binding */ squaredLength),
/* harmony export */   "negate": () => (/* binding */ negate),
/* harmony export */   "inverse": () => (/* binding */ inverse),
/* harmony export */   "normalize": () => (/* binding */ normalize),
/* harmony export */   "dot": () => (/* binding */ dot),
/* harmony export */   "cross": () => (/* binding */ cross),
/* harmony export */   "lerp": () => (/* binding */ lerp),
/* harmony export */   "hermite": () => (/* binding */ hermite),
/* harmony export */   "bezier": () => (/* binding */ bezier),
/* harmony export */   "random": () => (/* binding */ random),
/* harmony export */   "transformMat4": () => (/* binding */ transformMat4),
/* harmony export */   "transformMat3": () => (/* binding */ transformMat3),
/* harmony export */   "transformQuat": () => (/* binding */ transformQuat),
/* harmony export */   "rotateX": () => (/* binding */ rotateX),
/* harmony export */   "rotateY": () => (/* binding */ rotateY),
/* harmony export */   "rotateZ": () => (/* binding */ rotateZ),
/* harmony export */   "angle": () => (/* binding */ angle),
/* harmony export */   "zero": () => (/* binding */ zero),
/* harmony export */   "str": () => (/* binding */ str),
/* harmony export */   "exactEquals": () => (/* binding */ exactEquals),
/* harmony export */   "equals": () => (/* binding */ equals),
/* harmony export */   "sub": () => (/* binding */ sub),
/* harmony export */   "mul": () => (/* binding */ mul),
/* harmony export */   "div": () => (/* binding */ div),
/* harmony export */   "dist": () => (/* binding */ dist),
/* harmony export */   "sqrDist": () => (/* binding */ sqrDist),
/* harmony export */   "len": () => (/* binding */ len),
/* harmony export */   "sqrLen": () => (/* binding */ sqrLen),
/* harmony export */   "forEach": () => (/* binding */ forEach)
/* harmony export */ });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(11);

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(3);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {ReadonlyVec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */

function clone(a) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(3);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
/**
 * Calculates the length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate length of
 * @returns {Number} length of a
 */

function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return Math.hypot(x, y, z);
}
/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */

function fromValues(x, y, z) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the source vector
 * @returns {vec3} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */

function set(out, x, y, z) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}
/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  return out;
}
/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function divide(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  return out;
}
/**
 * Math.ceil the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to ceil
 * @returns {vec3} out
 */

function ceil(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  out[2] = Math.ceil(a[2]);
  return out;
}
/**
 * Math.floor the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to floor
 * @returns {vec3} out
 */

function floor(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  out[2] = Math.floor(a[2]);
  return out;
}
/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function min(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  return out;
}
/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function max(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  return out;
}
/**
 * Math.round the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to round
 * @returns {vec3} out
 */

function round(out, a) {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  out[2] = Math.round(a[2]);
  return out;
}
/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}
/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */

function scaleAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  return out;
}
/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} distance between a and b
 */

function distance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  return Math.hypot(x, y, z);
}
/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} squared distance between a and b
 */

function squaredDistance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  return x * x + y * y + z * z;
}
/**
 * Calculates the squared length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */

function squaredLength(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return x * x + y * y + z * z;
}
/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to negate
 * @returns {vec3} out
 */

function negate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  return out;
}
/**
 * Returns the inverse of the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to invert
 * @returns {vec3} out
 */

function inverse(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Calculates the dot product of two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} dot product of a and b
 */

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function cross(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2];
  var bx = b[0],
      by = b[1],
      bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}
/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */

function lerp(out, a, b, t) {
  var ax = a[0];
  var ay = a[1];
  var az = a[2];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  out[2] = az + t * (b[2] - az);
  return out;
}
/**
 * Performs a hermite interpolation with two control points
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {ReadonlyVec3} c the third operand
 * @param {ReadonlyVec3} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */

function hermite(out, a, b, c, d, t) {
  var factorTimes2 = t * t;
  var factor1 = factorTimes2 * (2 * t - 3) + 1;
  var factor2 = factorTimes2 * (t - 2) + t;
  var factor3 = factorTimes2 * (t - 1);
  var factor4 = factorTimes2 * (3 - 2 * t);
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  return out;
}
/**
 * Performs a bezier interpolation with two control points
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {ReadonlyVec3} c the third operand
 * @param {ReadonlyVec3} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */

function bezier(out, a, b, c, d, t) {
  var inverseFactor = 1 - t;
  var inverseFactorTimesTwo = inverseFactor * inverseFactor;
  var factorTimes2 = t * t;
  var factor1 = inverseFactorTimesTwo * inverseFactor;
  var factor2 = 3 * t * inverseFactorTimesTwo;
  var factor3 = 3 * factorTimes2 * inverseFactor;
  var factor4 = factorTimes2 * t;
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */

function random(out, scale) {
  scale = scale || 1.0;
  var r = _common_js__WEBPACK_IMPORTED_MODULE_0__.RANDOM() * 2.0 * Math.PI;
  var z = _common_js__WEBPACK_IMPORTED_MODULE_0__.RANDOM() * 2.0 - 1.0;
  var zScale = Math.sqrt(1.0 - z * z) * scale;
  out[0] = Math.cos(r) * zScale;
  out[1] = Math.sin(r) * zScale;
  out[2] = z * scale;
  return out;
}
/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec3} out
 */

function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat3} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */

function transformMat3(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  out[0] = x * m[0] + y * m[3] + z * m[6];
  out[1] = x * m[1] + y * m[4] + z * m[7];
  out[2] = x * m[2] + y * m[5] + z * m[8];
  return out;
}
/**
 * Transforms the vec3 with a quat
 * Can also be used for dual quaternions. (Multiply it with the real part)
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyQuat} q quaternion to transform with
 * @returns {vec3} out
 */

function transformQuat(out, a, q) {
  // benchmarks: https://jsperf.com/quaternion-transform-vec3-implementations-fixed
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3];
  var x = a[0],
      y = a[1],
      z = a[2]; // var qvec = [qx, qy, qz];
  // var uv = vec3.cross([], qvec, a);

  var uvx = qy * z - qz * y,
      uvy = qz * x - qx * z,
      uvz = qx * y - qy * x; // var uuv = vec3.cross([], qvec, uv);

  var uuvx = qy * uvz - qz * uvy,
      uuvy = qz * uvx - qx * uvz,
      uuvz = qx * uvy - qy * uvx; // vec3.scale(uv, uv, 2 * w);

  var w2 = qw * 2;
  uvx *= w2;
  uvy *= w2;
  uvz *= w2; // vec3.scale(uuv, uuv, 2);

  uuvx *= 2;
  uuvy *= 2;
  uuvz *= 2; // return vec3.add(out, a, vec3.add(out, uv, uuv));

  out[0] = x + uvx + uuvx;
  out[1] = y + uvy + uuvy;
  out[2] = z + uvz + uuvz;
  return out;
}
/**
 * Rotate a 3D vector around the x-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateX(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[0];
  r[1] = p[1] * Math.cos(rad) - p[2] * Math.sin(rad);
  r[2] = p[1] * Math.sin(rad) + p[2] * Math.cos(rad); //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Rotate a 3D vector around the y-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateY(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
  r[1] = p[1];
  r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad); //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Rotate a 3D vector around the z-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateZ(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[0] * Math.cos(rad) - p[1] * Math.sin(rad);
  r[1] = p[0] * Math.sin(rad) + p[1] * Math.cos(rad);
  r[2] = p[2]; //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Get the angle between two 3D vectors
 * @param {ReadonlyVec3} a The first operand
 * @param {ReadonlyVec3} b The second operand
 * @returns {Number} The angle in radians
 */

function angle(a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2],
      bx = b[0],
      by = b[1],
      bz = b[2],
      mag1 = Math.sqrt(ax * ax + ay * ay + az * az),
      mag2 = Math.sqrt(bx * bx + by * by + bz * bz),
      mag = mag1 * mag2,
      cosine = mag && dot(a, b) / mag;
  return Math.acos(Math.min(Math.max(cosine, -1), 1));
}
/**
 * Set the components of a vec3 to zero
 *
 * @param {vec3} out the receiving vector
 * @returns {vec3} out
 */

function zero(out) {
  out[0] = 0.0;
  out[1] = 0.0;
  out[2] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {ReadonlyVec3} a vector to represent as a string
 * @returns {String} string representation of the vector
 */

function str(a) {
  return "vec3(" + a[0] + ", " + a[1] + ", " + a[2] + ")";
}
/**
 * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyVec3} a The first vector.
 * @param {ReadonlyVec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {ReadonlyVec3} a The first vector.
 * @param {ReadonlyVec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2));
}
/**
 * Alias for {@link vec3.subtract}
 * @function
 */

var sub = subtract;
/**
 * Alias for {@link vec3.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link vec3.divide}
 * @function
 */

var div = divide;
/**
 * Alias for {@link vec3.distance}
 * @function
 */

var dist = distance;
/**
 * Alias for {@link vec3.squaredDistance}
 * @function
 */

var sqrDist = squaredDistance;
/**
 * Alias for {@link vec3.length}
 * @function
 */

var len = length;
/**
 * Alias for {@link vec3.squaredLength}
 * @function
 */

var sqrLen = squaredLength;
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach = function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
}();

/***/ }),
/* 11 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "EPSILON": () => (/* binding */ EPSILON),
/* harmony export */   "ARRAY_TYPE": () => (/* binding */ ARRAY_TYPE),
/* harmony export */   "RANDOM": () => (/* binding */ RANDOM),
/* harmony export */   "setMatrixArrayType": () => (/* binding */ setMatrixArrayType),
/* harmony export */   "toRadian": () => (/* binding */ toRadian),
/* harmony export */   "equals": () => (/* binding */ equals)
/* harmony export */ });
/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON = 0.000001;
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
var RANDOM = Math.random;
/**
 * Sets the type of array used when creating new vectors and matrices
 *
 * @param {Float32ArrayConstructor | ArrayConstructor} type Array type, such as Float32Array or Array
 */

function setMatrixArrayType(type) {
  ARRAY_TYPE = type;
}
var degree = Math.PI / 180;
/**
 * Convert Degree To Radian
 *
 * @param {Number} a Angle in Degrees
 */

function toRadian(a) {
  return a * degree;
}
/**
 * Tests whether or not the arguments have approximately the same value, within an absolute
 * or relative tolerance of glMatrix.EPSILON (an absolute tolerance is used for values less
 * than or equal to 1.0, and a relative tolerance is used for larger values)
 *
 * @param {Number} a The first number to test.
 * @param {Number} b The second number to test.
 * @returns {Boolean} True if the numbers are approximately equal, false otherwise.
 */

function equals(a, b) {
  return Math.abs(a - b) <= EPSILON * Math.max(1.0, Math.abs(a), Math.abs(b));
}
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/***/ }),
/* 12 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_Filters_General_WindowedSincPolyDataFilter__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(13);
/* harmony import */ var vtk_js_Sources_Common_DataModel_PolyData__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(32);
/* harmony import */ var _cc_logger__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3);




if (typeof window === 'undefined') {
  if (typeof globalThis === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.window = globalThis;
  }
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (maskIndicesVertices => {
  return maskIndicesVertices.map((m, i) => {
    const name = `smooth${i}`;
    _cc_logger__WEBPACK_IMPORTED_MODULE_2__.logger.time(name);
    const polydata = vtk_js_Sources_Common_DataModel_PolyData__WEBPACK_IMPORTED_MODULE_1__.default.newInstance();
    polydata.getPoints().setData(new Float32Array(m.vertices), 3);
    polydata.getPolys().setData(new Uint32Array(m.indices));
    const smoothFilter = vtk_js_Sources_Filters_General_WindowedSincPolyDataFilter__WEBPACK_IMPORTED_MODULE_0__.default.newInstance({
      nonManifoldSmoothing: 1,
      numberOfIterations: 15,
      boundarySmoothing: 1,
      featureEdgeSmoothing: 1,
      featureAngle: 120.0,
      passBand: 0.01,
      normalizeCoordinates: 1
    });
    smoothFilter.setInputData(polydata);
    smoothFilter.update();
    const output = smoothFilter.getOutputData();
    _cc_logger__WEBPACK_IMPORTED_MODULE_2__.logger.timeEnd(name);
    return {
      vertices: output.get().points.get().values,
      indices: output.get().polys.get().values
    };
  });
});

/***/ }),
/* 13 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(14);
/* harmony import */ var vtk_js_Sources_Common_DataModel_BoundingBox__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(16);
/* harmony import */ var vtk_js_Sources_Common_Core_DataArray__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(28);
/* harmony import */ var vtk_js_Sources_Common_Core_Math_index__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(17);
/* harmony import */ var vtk_js_Sources_Common_DataModel_DataSetAttributes_Constants__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(30);
/* harmony import */ var vtk_js_Sources_Common_Core_Points__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(31);
/* harmony import */ var vtk_js_Sources_Common_DataModel_PolyData__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(32);
/* harmony import */ var vtk_js_Sources_Common_DataModel_Triangle__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(45);










const VertexType = {
  VTK_SIMPLE_VERTEX: 0,
  VTK_FIXED_VERTEX: 1,
  VTK_FEATURE_EDGE_VERTEX: 2,
  VTK_BOUNDARY_EDGE_VERTEX: 3,
};

// ----------------------------------------------------------------------------
// vtkWindowedSincPolyDataFilter methods
// ----------------------------------------------------------------------------

function vtkWindowedSincPolyDataFilter(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkWindowedSincPolyDataFilter');

  publicAPI.vtkWindowedSincPolyDataFilterExecute = (
    inPts,
    inputPolyData,
    output
  ) => {
    if (!inPts || model.numberOfIterations <= 0) {
      return inPts;
    }
    const inPtsData = inPts.getData();

    const inVerts = inputPolyData.getVerts().getData();
    const inLines = inputPolyData.getLines().getData();
    const inPolys = inputPolyData.getPolys().getData();
    const inStrips = inputPolyData.getStrips().getData();

    const cosFeatureAngle = Math.cos(
      vtk_js_Sources_Common_Core_Math_index__WEBPACK_IMPORTED_MODULE_3__.default.radiansFromDegrees(model.featureAngle)
    );
    const cosEdgeAngle = Math.cos(vtk_js_Sources_Common_Core_Math_index__WEBPACK_IMPORTED_MODULE_3__.default.radiansFromDegrees(model.edgeAngle));

    const numPts = inPts.getNumberOfPoints();

    // Perform topological analysis. What we're going to do is build a connectivity
    // array of connected vertices. The outcome will be one of three
    // classifications for a vertex: VTK_SIMPLE_VERTEX, VTK_FIXED_VERTEX. or
    // VTK_EDGE_VERTEX. Simple vertices are smoothed using all connected
    // vertices. FIXED vertices are never smoothed. Edge vertices are smoothed
    // using a subset of the attached vertices.
    const verts = new Array(numPts);
    for (let i = 0; i < numPts; ++i) {
      verts[i] = {
        type: VertexType.VTK_SIMPLE_VERTEX,
        edges: null,
      };
    }

    // check vertices first. Vertices are never smoothed_--------------
    let npts = 0;
    for (let i = 0; i < inVerts.length; i += npts + 1) {
      npts = inVerts[i];
      const pts = inVerts.slice(i + 1, i + 1 + npts);
      for (let j = 0; j < pts.length; ++j) {
        verts[pts[j]].type = VertexType.VTK_FIXED_VERTEX;
      }
    }

    // now check lines. Only manifold lines can be smoothed------------
    for (let i = 0; i < inLines.length; i += npts + 1) {
      npts = inLines[i];
      const pts = inLines.slice(i + 1, i + 1 + npts);

      // Check for closed loop which are treated specially. Basically the
      // last point is ignored (set to fixed).
      const closedLoop = pts[0] === pts[npts - 1] && npts > 3;

      for (let j = 0; j < npts; ++j) {
        if (verts[pts[j]].type === VertexType.VTK_SIMPLE_VERTEX) {
          // First point
          if (j === 0) {
            if (!closedLoop) {
              verts[pts[0]].type = VertexType.VTK_FIXED_VERTEX;
            } else {
              verts[pts[0]].type = VertexType.VTK_FEATURE_EDGE_VERTEX;
              verts[pts[0]].edges = [pts[npts - 2], pts[1]];
            }
          }
          // Last point
          else if (j === npts - 1 && !closedLoop) {
            verts[pts[j]].type = VertexType.VTK_FIXED_VERTEX;
          }
          // In between point // is edge vertex (unless already edge vertex!)
          else {
            verts[pts[j]].type = VertexType.VTK_FEATURE_EDGE_VERTEX;
            verts[pts[j]].edges = [
              pts[j - 1],
              pts[closedLoop && j === npts - 2 ? 0 : j + 1],
            ];
          }
        } // if simple vertex

        // Vertex has been visited before, need to fix it. Special case
        // when working on closed loop.
        else if (
          verts[pts[j]].type === VertexType.VTK_FEATURE_EDGE_VERTEX &&
          !(closedLoop && j === npts - 1)
        ) {
          verts[pts[j]].type = VertexType.VTK_FIXED_VERTEX;
          verts[pts[j]].edges = null;
        }
      } // for all points in this line
    } // for all lines

    // now polygons and triangle strips-------------------------------
    const numPolys = inPolys.length;
    const numStrips = inStrips.length;
    if (numPolys > 0 || numStrips > 0) {
      const inMesh = vtk_js_Sources_Common_DataModel_PolyData__WEBPACK_IMPORTED_MODULE_6__.default.newInstance();
      inMesh.setPoints(inputPolyData.getPoints());
      inMesh.setPolys(inputPolyData.getPolys());
      const mesh = inMesh;

      let neighbors = [];
      let nei = 0;
      // const numNeiPts = 0;
      const normal = [];
      const neiNormal = [];

      /* TODO: Add vtkTriangleFilter
      if ( (numStrips = inputPolyData.getStrips().GetNumberOfCells()) > 0 )
      { // convert data to triangles
        inMesh.setStrips(inputPolyData.getStrips());
        const toTris = vtkTriangleFilter.newInstance();
        toTris.setInputData(inMesh);
        toTris.update();
        mesh = toTris.getOutput();
      }
      */

      mesh.buildLinks(); // to do neighborhood searching
      const polys = mesh.getPolys().getData();

      let cellId = 0;
      for (let c = 0; c < polys.length; c += npts + 1, ++cellId) {
        npts = polys[c];
        const pts = polys.slice(c + 1, c + 1 + npts);

        for (let i = 0; i < npts; ++i) {
          const p1 = pts[i];
          const p2 = pts[(i + 1) % npts];

          if (verts[p1].edges === null) {
            verts[p1].edges = [];
          }
          if (verts[p2].edges == null) {
            verts[p2].edges = [];
          }

          neighbors = mesh.getCellEdgeNeighbors(cellId, p1, p2);
          const numNei = neighbors.length; // neighbors->GetNumberOfIds();

          let edge = VertexType.VTK_SIMPLE_VERTEX;
          if (numNei === 0) {
            edge = VertexType.VTK_BOUNDARY_EDGE_VERTEX;
          } else if (numNei >= 2) {
            // non-manifold case, check nonmanifold smoothing state
            if (!model.nonManifoldSmoothing) {
              // check to make sure that this edge hasn't been marked already
              let j = 0;
              for (; j < numNei; ++j) {
                if (neighbors[j] < cellId) {
                  break;
                }
              }
              if (j >= numNei) {
                edge = VertexType.VTK_FEATURE_EDGE_VERTEX;
              }
            }
            /* eslint-disable no-cond-assign */
          } else if (numNei === 1 && (nei = neighbors[0]) > cellId) {
            if (model.featureEdgeSmoothing) {
              // TODO: support polygons
              // vtkPolygon::ComputeNormal(inPts,npts,pts,normal);
              vtk_js_Sources_Common_DataModel_Triangle__WEBPACK_IMPORTED_MODULE_7__.default.computeNormal(
                [...inPts.getPoint(pts[0])],
                [...inPts.getPoint(pts[1])],
                [...inPts.getPoint(pts[2])],
                normal
              );
              const { cellPointIds } = mesh.getCellPoints(nei);
              // vtkPolygon::ComputeNormal(inPts,numNeiPts,neiPts,neiNormal);
              vtk_js_Sources_Common_DataModel_Triangle__WEBPACK_IMPORTED_MODULE_7__.default.computeNormal(
                [...inPts.getPoint(cellPointIds[0])],
                [...inPts.getPoint(cellPointIds[1])],
                [...inPts.getPoint(cellPointIds[2])],
                neiNormal
              );

              if (vtk_js_Sources_Common_Core_Math_index__WEBPACK_IMPORTED_MODULE_3__.default.dot(normal, neiNormal) <= cosFeatureAngle) {
                edge = VertexType.VTK_FEATURE_EDGE_VERTEX;
              }
            }
          } // a visited edge; skip rest of analysis
          else {
            /* eslint-disable no-continue */
            continue;
          }

          if (edge && verts[p1].type === VertexType.VTK_SIMPLE_VERTEX) {
            verts[p1].edges = [p2];
            verts[p1].type = edge;
          } else if (
            (edge && verts[p1].type === VertexType.VTK_BOUNDARY_EDGE_VERTEX) ||
            (edge && verts[p1].type === VertexType.VTK_FEATURE_EDGE_VERTEX) ||
            (!edge && verts[p1].type === VertexType.VTK_SIMPLE_VERTEX)
          ) {
            verts[p1].edges.push(p2);
            if (
              verts[p1].type &&
              edge === VertexType.VTK_BOUNDARY_EDGE_VERTEX
            ) {
              verts[p1].type = VertexType.VTK_BOUNDARY_EDGE_VERTEX;
            }
          }
          if (edge && verts[p2].type === VertexType.VTK_SIMPLE_VERTEX) {
            verts[p2].edges = [p1];
            verts[p2].type = edge;
          } else if (
            (edge && verts[p2].type === VertexType.VTK_BOUNDARY_EDGE_VERTEX) ||
            (edge && verts[p2].type === VertexType.VTK_FEATURE_EDGE_VERTEX) ||
            (!edge && verts[p2].type === VertexType.VTK_SIMPLE_VERTEX)
          ) {
            verts[p2].edges.push(p1);
            if (
              verts[p2].type &&
              edge === VertexType.VTK_BOUNDARY_EDGE_VERTEX
            ) {
              verts[p2].type = VertexType.VTK_BOUNDARY_EDGE_VERTEX;
            }
          }
        }
      }
    } // if strips or polys

    // post-process edge vertices to make sure we can smooth them
    /* eslint-disable no-unused-vars */
    let numSimple = 0;
    let numBEdges = 0;
    let numFixed = 0;
    let numFEdges = 0;
    for (let i = 0; i < numPts; ++i) {
      if (verts[i].type === VertexType.VTK_SIMPLE_VERTEX) {
        ++numSimple;
      } else if (verts[i].type === VertexType.VTK_FIXED_VERTEX) {
        ++numFixed;
      } else if (
        verts[i].type === VertexType.VTK_FEATURE_EDGE_VERTEX ||
        verts[i].type === VertexType.VTK_BOUNDARY_EDGE_VERTEX
      ) {
        // see how many edges; if two, what the angle is

        if (
          !model.boundarySmoothing &&
          verts[i].type === VertexType.VTK_BOUNDARY_EDGE_VERTEX
        ) {
          verts[i].type = VertexType.VTK_FIXED_VERTEX;
          ++numBEdges;
        } else if ((npts = verts[i].edges.length) !== 2) {
          // can only smooth edges on 2-manifold surfaces
          verts[i].type = VertexType.VTK_FIXED_VERTEX;
          ++numFixed;
        } // check angle between edges
        else {
          const x1 = [0, 0, 0];
          inPts.getPoint(verts[i].edges[0], x1);
          const x2 = [0, 0, 0];
          inPts.getPoint(i, x2);
          const x3 = [0, 0, 0];
          inPts.getPoint(verts[i].edges[1], x3);

          const l1 = [0, 0, 0];
          const l2 = [0, 0, 0];
          for (let k = 0; k < 3; ++k) {
            l1[k] = x2[k] - x1[k];
            l2[k] = x3[k] - x2[k];
          }
          if (
            vtk_js_Sources_Common_Core_Math_index__WEBPACK_IMPORTED_MODULE_3__.default.normalize(l1) >= 0.0 &&
            vtk_js_Sources_Common_Core_Math_index__WEBPACK_IMPORTED_MODULE_3__.default.normalize(l2) >= 0.0 &&
            vtk_js_Sources_Common_Core_Math_index__WEBPACK_IMPORTED_MODULE_3__.default.dot(l1, l2) < cosEdgeAngle
          ) {
            ++numFixed;
            verts[i].type = VertexType.VTK_FIXED_VERTEX;
          } else if (verts[i].type === VertexType.VTK_FEATURE_EDGE_VERTEX) {
            ++numFEdges;
          } else {
            ++numBEdges;
          }
        } // if along edge
      } // if edge vertex
    } // for all points

    // Perform Windowed Sinc function interpolation
    //
    // console.log('Beginning smoothing iterations...');
    // need 4 vectors of points
    let zero = 0;
    let one = 1;
    let two = 2;
    const three = 3;

    const newPts = [];
    newPts.push(vtk_js_Sources_Common_Core_Points__WEBPACK_IMPORTED_MODULE_5__.default.newInstance());
    newPts[zero].setNumberOfPoints(numPts);
    newPts.push(vtk_js_Sources_Common_Core_Points__WEBPACK_IMPORTED_MODULE_5__.default.newInstance());
    newPts[one].setNumberOfPoints(numPts);
    newPts.push(vtk_js_Sources_Common_Core_Points__WEBPACK_IMPORTED_MODULE_5__.default.newInstance());
    newPts[two].setNumberOfPoints(numPts);
    newPts.push(vtk_js_Sources_Common_Core_Points__WEBPACK_IMPORTED_MODULE_5__.default.newInstance());
    newPts[three].setNumberOfPoints(numPts);

    // Get the center and length of the input dataset
    const inCenter = vtk_js_Sources_Common_DataModel_BoundingBox__WEBPACK_IMPORTED_MODULE_1__.default.getCenter(inputPolyData.getBounds());
    const inLength = vtk_js_Sources_Common_DataModel_BoundingBox__WEBPACK_IMPORTED_MODULE_1__.default.getDiagonalLength(
      inputPolyData.getBounds()
    );

    if (!model.normalizeCoordinates) {
      // initialize to old coordinates
      // for (let i = 0; i < numPts; ++i) {
      //   newPts[zero].setPoint(i, inPts.subarray(i));
      // }
      const copy = new window[newPts[zero].getDataType()](inPtsData);
      newPts[zero].setData(copy, 3);
    } else {
      // center the data and scale to be within unit cube [-1, 1]
      // initialize to old coordinates
      const normalizedPoint = [0, 0, 0];
      for (let i = 0; i < numPts; ++i) {
        inPts.getPoint(i, normalizedPoint);
        normalizedPoint[0] = (normalizedPoint[0] - inCenter[0]) / inLength;
        normalizedPoint[1] = (normalizedPoint[1] - inCenter[1]) / inLength;
        normalizedPoint[2] = (normalizedPoint[2] - inCenter[2]) / inLength;
        newPts[zero].setPoint(i, ...normalizedPoint);
      }
    }

    // Smooth with a low pass filter defined as a windowed sinc function.
    // Taubin describes this methodology is the IBM tech report RC-20404
    // (#90237, dated 3/12/96) "Optimal Surface Smoothing as Filter Design"
    // G. Taubin, T. Zhang and G. Golub. (Zhang and Golub are at Stanford
    // University)

    // The formulas here follow the notation of Taubin's TR, i.e.
    // newPts[zero], newPts[one], etc.

    // calculate weights and filter coefficients
    const kPb = model.passBand; // reasonable default for kPb in [0, 2] is 0.1
    const thetaPb = Math.acos(1.0 - 0.5 * kPb); // thetaPb in [0, M_PI/2]

    // vtkDebugMacro(<< "thetaPb = " << thetaPb);

    const w = new Array(model.numberOfIterations + 1);
    const c = new Array(model.numberOfIterations + 1);
    const cprime = new Array(model.numberOfIterations + 1);

    const zerovector = [0, 0, 0];

    // Calculate the weights and the Chebychev coefficients c.
    //

    // Windowed sinc function weights. This is for a Hamming window. Other
    // windowing function could be implemented here.
    for (let i = 0; i <= model.numberOfIterations; ++i) {
      w[i] =
        0.54 + 0.46 * Math.cos((i * Math.PI) / (model.numberOfIterations + 1));
    }

    // Calculate the optimal sigma (offset or fudge factor for the filter).
    // This is a Newton-Raphson Search.
    let fKpb = 0;
    let fPrimeKpb = 0;
    let done = false;
    let sigma = 0.0;

    for (let j = 0; !done && j < 500; ++j) {
      // Chebyshev coefficients
      c[0] = (w[0] * (thetaPb + sigma)) / Math.PI;
      for (let i = 1; i <= model.numberOfIterations; ++i) {
        c[i] = (2.0 * w[i] * Math.sin(i * (thetaPb + sigma))) / (i * Math.PI);
      }

      // calculate the Chebyshev coefficients for the derivative of the filter
      cprime[model.numberOfIterations] = 0.0;
      cprime[model.numberOfIterations - 1] = 0.0;
      if (model.numberOfIterations > 1) {
        cprime[model.numberOfIterations - 2] =
          2.0 *
          (model.numberOfIterations - 1) *
          c[model.numberOfIterations - 1];
      }
      for (let i = model.numberOfIterations - 3; i >= 0; --i) {
        cprime[i] = cprime[i + 2] + 2.0 * (i + 1) * c[i + 1];
      }
      // Evaluate the filter and its derivative at kPb (note the discrepancy
      // of calculating the c's based on thetaPb + sigma and evaluating the
      // filter at kPb (which is equivalent to thetaPb)
      fKpb = 0.0;
      fPrimeKpb = 0.0;
      fKpb += c[0];
      fPrimeKpb += cprime[0];
      for (let i = 1; i <= model.numberOfIterations; ++i) {
        if (i === 1) {
          fKpb += c[i] * (1.0 - 0.5 * kPb);
          fPrimeKpb += cprime[i] * (1.0 - 0.5 * kPb);
        } else {
          fKpb += c[i] * Math.cos(i * Math.acos(1.0 - 0.5 * kPb));
          fPrimeKpb += cprime[i] * Math.cos(i * Math.acos(1.0 - 0.5 * kPb));
        }
      }
      // if fKpb is not close enough to 1.0, then adjust sigma
      if (model.numberOfIterations > 1) {
        if (Math.abs(fKpb - 1.0) >= 1e-3) {
          sigma -= (fKpb - 1.0) / fPrimeKpb; // Newton-Rhapson (want f=1)
        } else {
          done = true;
        }
      } else {
        // Order of Chebyshev is 1. Can't use Newton-Raphson to find an
        // optimal sigma. Object will most likely shrink.
        done = true;
        sigma = 0.0;
      }
    }
    if (Math.abs(fKpb - 1.0) >= 1e-3) {
      console.log(
        'An optimal offset for the smoothing filter could not be found.  Unpredictable smoothing/shrinkage may result.'
      );
    }

    const x = [0, 0, 0];
    const y = [0, 0, 0];
    const deltaX = [0, 0, 0];
    const xNew = [0, 0, 0];
    const x1 = [0, 0, 0];
    const x2 = [0, 0, 0];

    // first iteration
    for (let i = 0; i < numPts; ++i) {
      if (verts[i].edges != null && (npts = verts[i].edges.length) > 0) {
        // point is allowed to move
        newPts[zero].getPoint(i, x); // use current points
        deltaX[0] = 0.0;
        deltaX[1] = 0.0;
        deltaX[2] = 0.0;

        // calculate the negative of the laplacian
        // for all connected points
        for (let j = 0; j < npts; ++j) {
          newPts[zero].getPoint(verts[i].edges[j], y);
          for (let k = 0; k < 3; ++k) {
            deltaX[k] += (x[k] - y[k]) / npts;
          }
        }
        // newPts[one] = newPts[zero] - 0.5 newPts[one]
        for (let k = 0; k < 3; ++k) {
          deltaX[k] = x[k] - 0.5 * deltaX[k];
        }
        newPts[one].setPoint(i, ...deltaX);

        if (verts[i].type === VertexType.VTK_FIXED_VERTEX) {
          newPts[zero].getPoint(i, deltaX);
        } else {
          // calculate newPts[three] = c0 newPts[zero] + c1 newPts[one]
          for (let k = 0; k < 3; ++k) {
            deltaX[k] = c[0] * x[k] + c[1] * deltaX[k];
          }
        }
        newPts[three].setPoint(i, ...deltaX);
      } // if can move point
      else {
        // point is not allowed to move, just use the old point...
        // (zero out the Laplacian)
        newPts[one].setPoint(i, ...zerovector);
        newPts[zero].getPoint(i, deltaX);
        newPts[three].setPoint(i, ...deltaX);
      }
    } // for all points

    // for the rest of the iterations
    const pX0 = [0, 0, 0];
    const pX1 = [0, 0, 0];
    const pX3 = [0, 0, 0];
    let iterationNumber = 2;
    for (; iterationNumber <= model.numberOfIterations; iterationNumber++) {
      if (iterationNumber && !(iterationNumber % 5)) {
        // this->UpdateProgress (0.5 + 0.5*iterationNumber/this->NumberOfIterations);
        // if (this->GetAbortExecute())
        // {
        //  break;
        // }
      }

      for (let i = 0; i < numPts; ++i) {
        npts = verts[i].edges != null ? verts[i].edges.length : 0;
        if (npts > 0) {
          // point is allowed to move
          newPts[zero].getPoint(i, pX0); // use current points
          newPts[one].getPoint(i, pX1);

          deltaX[0] = 0.0;
          deltaX[1] = 0.0;
          deltaX[2] = 0.0;

          // calculate the negative laplacian of x1
          for (let j = 0; j < npts; ++j) {
            newPts[one].getPoint(verts[i].edges[j], y);
            for (let k = 0; k < 3; ++k) {
              deltaX[k] += (pX1[k] - y[k]) / npts;
            }
          } // for all connected points

          // Taubin:  x2 = (x1 - x0) + (x1 - x2)
          for (let k = 0; k < 3; ++k) {
            deltaX[k] = pX1[k] - pX0[k] + pX1[k] - deltaX[k];
          }
          newPts[two].setPoint(i, ...deltaX);

          // smooth the vertex (x3 = x3 + cj x2)
          newPts[three].getPoint(i, pX3);
          for (let k = 0; k < 3; ++k) {
            xNew[k] = pX3[k] + c[iterationNumber] * deltaX[k];
          }
          if (verts[i].type !== VertexType.VTK_FIXED_VERTEX) {
            newPts[three].setPoint(i, ...xNew);
          }
        } // if can move point
        else {
          // point is not allowed to move, just use the old point...
          // (zero out the Laplacian)
          newPts[one].setPoint(i, ...zerovector);
          newPts[two].setPoint(i, ...zerovector);
        }
      } // for all points

      // update the pointers. three is always three. all other pointers
      // shift by one and wrap.
      zero = (1 + zero) % 3;
      one = (1 + one) % 3;
      two = (1 + two) % 3;
    } // for all iterations or until converge

    // move the iteration count back down so that it matches the
    // actual number of iterations executed
    --iterationNumber;

    // set zero to three so the correct set of positions is outputted
    zero = three;

    // console.log('Performed', iterationNumber, 'smoothing passes');
    // if we scaled the data down to the unit cube, then scale data back
    // up to the original space
    if (model.normalizeCoordinates) {
      // Re-position the coordinated
      const repositionedPoint = [0, 0, 0];
      for (let i = 0; i < numPts; ++i) {
        newPts[zero].getPoint(i, repositionedPoint);
        for (let j = 0; j < 3; ++j) {
          repositionedPoint[j] = repositionedPoint[j] * inLength + inCenter[j];
        }
        newPts[zero].setPoint(i, ...repositionedPoint);
      }
    }

    if (model.generateErrorScalars) {
      const newScalars = new Float32Array(numPts);

      for (let i = 0; i < numPts; ++i) {
        inPts.getPoint(i, x1);
        newPts[zero].getPoint(i, x2);
        newScalars[i] = Math.sqrt(Math.distance2BetweenPoints(x1, x2));
      }

      const newScalarsArray = vtk_js_Sources_Common_Core_DataArray__WEBPACK_IMPORTED_MODULE_2__.default.newInstance({
        numberOfComponents: 1,
        values: newScalars,
      });

      const idx = output.getPointData().addArray(newScalarsArray);
      output.getPointData().setActiveAttribute(idx, vtk_js_Sources_Common_DataModel_DataSetAttributes_Constants__WEBPACK_IMPORTED_MODULE_4__.AttributeTypes.SCALARS);
    }

    if (model.generateErrorVectors) {
      const newVectors = new Float32Array(3 * numPts);
      for (let i = 0; i < numPts; ++i) {
        inPts.getPoint(i, x1);
        newPts[zero].getPoint(i, x2);
        for (let j = 0; j < 3; ++j) {
          newVectors[3 * i + j] = x2[j] - x1[j];
        }
      }

      const newVectorsArray = vtk_js_Sources_Common_Core_DataArray__WEBPACK_IMPORTED_MODULE_2__.default.newInstance({
        numberOfComponents: 3,
        values: newVectors,
      });

      output.getPointData().setVectors(newVectorsArray);
    }

    return newPts[zero];
  };

  publicAPI.requestData = (inData, outData) => {
    const numberOfInputs = publicAPI.getNumberOfInputPorts();

    if (!numberOfInputs) {
      return;
    }

    const input = inData[0];

    if (!input) {
      return;
    }
    const output = vtk_js_Sources_Common_DataModel_PolyData__WEBPACK_IMPORTED_MODULE_6__.default.newInstance();

    const outputPoints = publicAPI.vtkWindowedSincPolyDataFilterExecute(
      input.getPoints(),
      input,
      output
    );

    output.setPointData(input.getPointData());
    output.setCellData(input.getCellData());
    output.setFieldData(input.getFieldData());
    output.setPoints(outputPoints);
    output.setVerts(input.getVerts());
    output.setLines(input.getLines());
    output.setPolys(input.getPolys());
    output.setStrips(input.getStrips());

    outData[0] = output;
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------
const DEFAULT_VALUES = {
  numberOfIterations: 20,
  passBand: 0.1,
  featureAngle: 45.0,
  edgeAngle: 15.0,
  featureEdgeSmoothing: 0,
  boundarySmoothing: 1,
  nonManifoldSmoothing: 0,
  generateErrorScalars: 0,
  generateErrorVectors: 0,
  normalizeCoordinates: 0,
};

// ----------------------------------------------------------------------------
function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  /* Make this a VTK object */

  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.obj(publicAPI, model);

  /* Also make it an algorithm with one input and one output */

  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.algo(publicAPI, model, 1, 1);

  /* Setters */
  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.setGet(publicAPI, model, [
    'numberOfIterations',
    'passBand',
    'featureAngle',
    'edgeAngle',
    'featureEdgeSmoothing',
    'boundarySmoothing',
    'nonManifoldSmoothing',
    'generateErrorScalars',
    'generateErrorVectors',
    'normalizeCoordinates',
  ]);

  /* Object specific methods */

  vtkWindowedSincPolyDataFilter(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.newInstance(
  extend,
  'vtkWindowedSincPolyDataFilter'
);

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend });


/***/ }),
/* 14 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "VOID": () => (/* binding */ VOID),
/* harmony export */   "setLoggerFunction": () => (/* binding */ setLoggerFunction),
/* harmony export */   "vtkLogMacro": () => (/* binding */ vtkLogMacro),
/* harmony export */   "vtkInfoMacro": () => (/* binding */ vtkInfoMacro),
/* harmony export */   "vtkDebugMacro": () => (/* binding */ vtkDebugMacro),
/* harmony export */   "vtkErrorMacro": () => (/* binding */ vtkErrorMacro),
/* harmony export */   "vtkWarningMacro": () => (/* binding */ vtkWarningMacro),
/* harmony export */   "vtkOnceErrorMacro": () => (/* binding */ vtkOnceErrorMacro),
/* harmony export */   "TYPED_ARRAYS": () => (/* binding */ TYPED_ARRAYS),
/* harmony export */   "capitalize": () => (/* binding */ capitalize),
/* harmony export */   "uncapitalize": () => (/* binding */ uncapitalize),
/* harmony export */   "formatBytesToProperUnit": () => (/* binding */ formatBytesToProperUnit),
/* harmony export */   "formatNumbersWithThousandSeparator": () => (/* binding */ formatNumbersWithThousandSeparator),
/* harmony export */   "setImmediateVTK": () => (/* binding */ setImmediateVTK),
/* harmony export */   "obj": () => (/* binding */ obj),
/* harmony export */   "get": () => (/* binding */ get),
/* harmony export */   "set": () => (/* binding */ set),
/* harmony export */   "setGet": () => (/* binding */ setGet),
/* harmony export */   "getArray": () => (/* binding */ getArray),
/* harmony export */   "setArray": () => (/* binding */ setArray),
/* harmony export */   "setGetArray": () => (/* binding */ setGetArray),
/* harmony export */   "algo": () => (/* binding */ algo),
/* harmony export */   "EVENT_ABORT": () => (/* binding */ EVENT_ABORT),
/* harmony export */   "event": () => (/* binding */ event),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "chain": () => (/* binding */ chain),
/* harmony export */   "isVtkObject": () => (/* binding */ isVtkObject),
/* harmony export */   "traverseInstanceTree": () => (/* binding */ traverseInstanceTree),
/* harmony export */   "debounce": () => (/* binding */ debounce),
/* harmony export */   "throttle": () => (/* binding */ throttle),
/* harmony export */   "keystore": () => (/* binding */ keystore),
/* harmony export */   "proxy": () => (/* binding */ proxy),
/* harmony export */   "proxyPropertyMapping": () => (/* binding */ proxyPropertyMapping),
/* harmony export */   "proxyPropertyState": () => (/* binding */ proxyPropertyState),
/* harmony export */   "normalizeWheel": () => (/* binding */ normalizeWheel),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _vtk__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(15);


let globalMTime = 0;

const VOID = Symbol('void');

function getCurrentGlobalMTime() {
  return globalMTime;
}

// ----------------------------------------------------------------------------
// Logging function calls
// ----------------------------------------------------------------------------
/* eslint-disable no-prototype-builtins                                      */

const fakeConsole = {};

function noOp() {}

const consoleMethods = [
  'log',
  'debug',
  'info',
  'warn',
  'error',
  'time',
  'timeEnd',
  'group',
  'groupEnd',
];
consoleMethods.forEach((methodName) => {
  fakeConsole[methodName] = noOp;
});

__webpack_require__.g.console = console.hasOwnProperty('log') ? console : fakeConsole;

const loggerFunctions = {
  debug: noOp, // Don't print debug by default
  error: __webpack_require__.g.console.error || noOp,
  info: __webpack_require__.g.console.info || noOp,
  log: __webpack_require__.g.console.log || noOp,
  warn: __webpack_require__.g.console.warn || noOp,
};

function setLoggerFunction(name, fn) {
  if (loggerFunctions[name]) {
    loggerFunctions[name] = fn || noOp;
  }
}

function vtkLogMacro(...args) {
  loggerFunctions.log(...args);
}

function vtkInfoMacro(...args) {
  loggerFunctions.info(...args);
}

function vtkDebugMacro(...args) {
  loggerFunctions.debug(...args);
}

function vtkErrorMacro(...args) {
  loggerFunctions.error(...args);
}

function vtkWarningMacro(...args) {
  loggerFunctions.warn(...args);
}

const ERROR_ONCE_MAP = {};
function vtkOnceErrorMacro(str) {
  if (!ERROR_ONCE_MAP[str]) {
    loggerFunctions.error(str);
    ERROR_ONCE_MAP[str] = true;
  }
}

// ----------------------------------------------------------------------------
// TypedArray
// ----------------------------------------------------------------------------

const TYPED_ARRAYS = {
  Float32Array,
  Float64Array,
  Uint8Array,
  Int8Array,
  Uint16Array,
  Int16Array,
  Uint32Array,
  Int32Array,
};

// ----------------------------------------------------------------------------
// capitilze provided string
// ----------------------------------------------------------------------------

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function uncapitalize(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

// ----------------------------------------------------------------------------
// Convert byte size into a well formatted string
// ----------------------------------------------------------------------------

function formatBytesToProperUnit(size, precision = 2, chunkSize = 1000) {
  const units = ['TB', 'GB', 'MB', 'KB'];
  let value = Number(size);
  let currentUnit = 'B';
  while (value > chunkSize) {
    value /= chunkSize;
    currentUnit = units.pop();
  }
  return `${value.toFixed(precision)} ${currentUnit}`;
}
// ----------------------------------------------------------------------------
// Convert thousand number with proper separator
// ----------------------------------------------------------------------------

function formatNumbersWithThousandSeparator(n, separator = ' ') {
  const sections = [];
  let size = n;
  while (size > 1000) {
    sections.push(`000${size % 1000}`.slice(-3));
    size = Math.floor(size / 1000);
  }
  if (size > 0) {
    sections.push(size);
  }
  sections.reverse();
  return sections.join(separator);
}

// ----------------------------------------------------------------------------
// Array helper
// ----------------------------------------------------------------------------

function safeArrays(model) {
  Object.keys(model).forEach((key) => {
    if (Array.isArray(model[key])) {
      model[key] = [].concat(model[key]);
    }
  });
}

// ----------------------------------------------------------------------------
// shallow equals
// ----------------------------------------------------------------------------

function shallowEquals(a, b) {
  if (a === b) {
    return true;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  return false;
}

// ----------------------------------------------------------------------------

function enumToString(e, value) {
  return Object.keys(e).find((key) => e[key] === value);
}

function getStateArrayMapFunc(item) {
  if (item.isA) {
    return item.getState();
  }
  return item;
}

// ----------------------------------------------------------------------------
// setImmediate
// ----------------------------------------------------------------------------

function setImmediateVTK(fn) {
  setTimeout(fn, 0);
}

// ----------------------------------------------------------------------------
// vtkObject: modified(), onModified(callback), delete()
// ----------------------------------------------------------------------------

function obj(publicAPI = {}, model = {}) {
  // Ensure each instance as a unique ref of array
  safeArrays(model);

  const callbacks = [];
  if (!Number.isInteger(model.mtime)) {
    model.mtime = ++globalMTime;
  }
  model.classHierarchy = ['vtkObject'];

  function off(index) {
    callbacks[index] = null;
  }

  function on(index) {
    function unsubscribe() {
      off(index);
    }
    return Object.freeze({
      unsubscribe,
    });
  }

  publicAPI.isDeleted = () => !!model.deleted;

  publicAPI.modified = (otherMTime) => {
    if (model.deleted) {
      vtkErrorMacro('instance deleted - cannot call any method');
      return;
    }

    if (otherMTime && otherMTime < publicAPI.getMTime()) {
      return;
    }

    model.mtime = ++globalMTime;
    callbacks.forEach((callback) => callback && callback(publicAPI));
  };

  publicAPI.onModified = (callback) => {
    if (model.deleted) {
      vtkErrorMacro('instance deleted - cannot call any method');
      return null;
    }

    const index = callbacks.length;
    callbacks.push(callback);
    return on(index);
  };

  publicAPI.getMTime = () => model.mtime;

  publicAPI.isA = (className) => {
    let count = model.classHierarchy.length;
    // we go backwards as that is more likely for
    // early termination
    while (count--) {
      if (model.classHierarchy[count] === className) {
        return true;
      }
    }
    return false;
  };

  publicAPI.getClassName = (depth = 0) =>
    model.classHierarchy[model.classHierarchy.length - 1 - depth];

  publicAPI.set = (map = {}, noWarning = false, noFunction = false) => {
    let ret = false;
    Object.keys(map).forEach((name) => {
      const fn = noFunction ? null : publicAPI[`set${capitalize(name)}`];
      if (fn && Array.isArray(map[name]) && fn.length > 1) {
        ret = fn(...map[name]) || ret;
      } else if (fn) {
        ret = fn(map[name]) || ret;
      } else {
        // Set data on model directly
        if (['mtime'].indexOf(name) === -1 && !noWarning) {
          vtkWarningMacro(
            `Warning: Set value to model directly ${name}, ${map[name]}`
          );
        }
        model[name] = map[name];
        ret = true;
      }
    });
    return ret;
  };

  publicAPI.get = (...list) => {
    if (!list.length) {
      return model;
    }
    const subset = {};
    list.forEach((name) => {
      subset[name] = model[name];
    });
    return subset;
  };

  publicAPI.getReferenceByName = (val) => model[val];

  publicAPI.delete = () => {
    Object.keys(model).forEach((field) => delete model[field]);
    callbacks.forEach((el, index) => off(index));

    // Flag the instance being deleted
    model.deleted = true;
  };

  // Add serialization support
  publicAPI.getState = () => {
    const jsonArchive = { ...model, vtkClass: publicAPI.getClassName() };

    // Convert every vtkObject to its serializable form
    Object.keys(jsonArchive).forEach((keyName) => {
      if (jsonArchive[keyName] === null || jsonArchive[keyName] === undefined) {
        delete jsonArchive[keyName];
      } else if (jsonArchive[keyName].isA) {
        jsonArchive[keyName] = jsonArchive[keyName].getState();
      } else if (Array.isArray(jsonArchive[keyName])) {
        jsonArchive[keyName] = jsonArchive[keyName].map(getStateArrayMapFunc);
      }
    });

    // Sort resulting object by key name
    const sortedObj = {};
    Object.keys(jsonArchive)
      .sort()
      .forEach((name) => {
        sortedObj[name] = jsonArchive[name];
      });

    // Remove mtime
    if (sortedObj.mtime) {
      delete sortedObj.mtime;
    }

    return sortedObj;
  };

  // Add shallowCopy(otherInstance) support
  publicAPI.shallowCopy = (other, debug = false) => {
    if (other.getClassName() !== publicAPI.getClassName()) {
      throw new Error(
        `Cannot ShallowCopy ${other.getClassName()} into ${publicAPI.getClassName()}`
      );
    }
    const otherModel = other.get();

    const keyList = Object.keys(model).sort();
    const otherKeyList = Object.keys(otherModel).sort();

    otherKeyList.forEach((key) => {
      const keyIdx = keyList.indexOf(key);
      if (keyIdx === -1) {
        if (debug) {
          vtkDebugMacro(`add ${key} in shallowCopy`);
        }
      } else {
        keyList.splice(keyIdx, 1);
      }
      model[key] = otherModel[key];
    });
    if (keyList.length && debug) {
      vtkDebugMacro(`Untouched keys: ${keyList.join(', ')}`);
    }

    publicAPI.modified();
  };

  // Allow usage as decorator
  return publicAPI;
}

// ----------------------------------------------------------------------------
// getXXX: add getters
// ----------------------------------------------------------------------------

function get(publicAPI, model, fieldNames) {
  fieldNames.forEach((field) => {
    if (typeof field === 'object') {
      publicAPI[`get${capitalize(field.name)}`] = () => model[field.name];
    } else {
      publicAPI[`get${capitalize(field)}`] = () => model[field];
    }
  });
}

// ----------------------------------------------------------------------------
// setXXX: add setters
// ----------------------------------------------------------------------------

const objectSetterMap = {
  enum(publicAPI, model, field) {
    return (value) => {
      if (typeof value === 'string') {
        if (field.enum[value] !== undefined) {
          if (model[field.name] !== field.enum[value]) {
            model[field.name] = field.enum[value];
            publicAPI.modified();
            return true;
          }
          return false;
        }
        vtkErrorMacro(`Set Enum with invalid argument ${field}, ${value}`);
        throw new RangeError('Set Enum with invalid string argument');
      }
      if (typeof value === 'number') {
        if (model[field.name] !== value) {
          if (
            Object.keys(field.enum)
              .map((key) => field.enum[key])
              .indexOf(value) !== -1
          ) {
            model[field.name] = value;
            publicAPI.modified();
            return true;
          }
          vtkErrorMacro(`Set Enum outside numeric range ${field}, ${value}`);
          throw new RangeError('Set Enum outside numeric range');
        }
        return false;
      }
      vtkErrorMacro(
        `Set Enum with invalid argument (String/Number) ${field}, ${value}`
      );
      throw new TypeError('Set Enum with invalid argument (String/Number)');
    };
  },
};

function findSetter(field) {
  if (typeof field === 'object') {
    const fn = objectSetterMap[field.type];
    if (fn) {
      return (publicAPI, model) => fn(publicAPI, model, field);
    }

    vtkErrorMacro(`No setter for field ${field}`);
    throw new TypeError('No setter for field');
  }
  return function getSetter(publicAPI, model) {
    return function setter(value) {
      if (model.deleted) {
        vtkErrorMacro('instance deleted - cannot call any method');
        return false;
      }

      if (model[field] !== value) {
        model[field] = value;
        publicAPI.modified();
        return true;
      }
      return false;
    };
  };
}

function set(publicAPI, model, fields) {
  fields.forEach((field) => {
    if (typeof field === 'object') {
      publicAPI[`set${capitalize(field.name)}`] = findSetter(field)(
        publicAPI,
        model
      );
    } else {
      publicAPI[`set${capitalize(field)}`] = findSetter(field)(
        publicAPI,
        model
      );
    }
  });
}

// ----------------------------------------------------------------------------
// set/get XXX: add both setters and getters
// ----------------------------------------------------------------------------

function setGet(publicAPI, model, fieldNames) {
  get(publicAPI, model, fieldNames);
  set(publicAPI, model, fieldNames);
}

// ----------------------------------------------------------------------------
// getXXX: add getters for object of type array with copy to be safe
// getXXXByReference: add getters for object of type array without copy
// ----------------------------------------------------------------------------

function getArray(publicAPI, model, fieldNames) {
  fieldNames.forEach((field) => {
    publicAPI[`get${capitalize(field)}`] = () => [].concat(model[field]);
    publicAPI[`get${capitalize(field)}ByReference`] = () => model[field];
  });
}

// ----------------------------------------------------------------------------
// setXXX: add setter for object of type array
// if 'defaultVal' is supplied, shorter arrays will be padded to 'size' with 'defaultVal'
// set...From: fast path to copy the content of an array to the current one without call to modified.
// ----------------------------------------------------------------------------

function setArray(
  publicAPI,
  model,
  fieldNames,
  size,
  defaultVal = undefined
) {
  fieldNames.forEach((field) => {
    publicAPI[`set${capitalize(field)}`] = (...args) => {
      if (model.deleted) {
        vtkErrorMacro('instance deleted - cannot call any method');
        return false;
      }

      let array = args;
      // allow an array passed as a single arg.
      if (array.length === 1 && Array.isArray(array[0])) {
        /* eslint-disable prefer-destructuring */
        array = array[0];
        /* eslint-enable prefer-destructuring */
      }

      if (array.length !== size) {
        if (array.length < size && defaultVal !== undefined) {
          array = [].concat(array);
          while (array.length < size) array.push(defaultVal);
        } else {
          throw new RangeError(
            `Invalid number of values for array setter (${field})`
          );
        }
      }
      let changeDetected = false;
      model[field].forEach((item, index) => {
        if (item !== array[index]) {
          if (changeDetected) {
            return;
          }
          changeDetected = true;
        }
      });

      if (changeDetected || model[field].length !== array.length) {
        model[field] = [].concat(array);
        publicAPI.modified();
        return true;
      }
      return false;
    };

    publicAPI[`set${capitalize(field)}From`] = (otherArray) => {
      const target = model[field];
      otherArray.forEach((v, i) => {
        target[i] = v;
      });
    };
  });
}

// ----------------------------------------------------------------------------
// set/get XXX: add setter and getter for object of type array
// ----------------------------------------------------------------------------

function setGetArray(
  publicAPI,
  model,
  fieldNames,
  size,
  defaultVal = undefined
) {
  getArray(publicAPI, model, fieldNames);
  setArray(publicAPI, model, fieldNames, size, defaultVal);
}

// ----------------------------------------------------------------------------
// vtkAlgorithm: setInputData(), setInputConnection(), getOutputData(), getOutputPort()
// ----------------------------------------------------------------------------

function algo(publicAPI, model, numberOfInputs, numberOfOutputs) {
  if (model.inputData) {
    model.inputData = model.inputData.map(_vtk__WEBPACK_IMPORTED_MODULE_0__.default);
  } else {
    model.inputData = [];
  }

  if (model.inputConnection) {
    model.inputConnection = model.inputConnection.map(_vtk__WEBPACK_IMPORTED_MODULE_0__.default);
  } else {
    model.inputConnection = [];
  }

  if (model.output) {
    model.output = model.output.map(_vtk__WEBPACK_IMPORTED_MODULE_0__.default);
  } else {
    model.output = [];
  }

  if (model.inputArrayToProcess) {
    model.inputArrayToProcess = model.inputArrayToProcess.map(_vtk__WEBPACK_IMPORTED_MODULE_0__.default);
  } else {
    model.inputArrayToProcess = [];
  }

  // Cache the argument for later manipulation
  model.numberOfInputs = numberOfInputs;

  // Methods
  function setInputData(dataset, port = 0) {
    if (model.deleted) {
      vtkErrorMacro('instance deleted - cannot call any method');
      return;
    }
    if (port >= model.numberOfInputs) {
      vtkErrorMacro(
        `algorithm ${publicAPI.getClassName()} only has ${
          model.numberOfInputs
        } input ports. To add more input ports, use addInputData()`
      );
      return;
    }
    if (model.inputData[port] !== dataset || model.inputConnection[port]) {
      model.inputData[port] = dataset;
      model.inputConnection[port] = null;
      if (publicAPI.modified) {
        publicAPI.modified();
      }
    }
  }

  function getInputData(port = 0) {
    if (model.inputConnection[port]) {
      model.inputData[port] = model.inputConnection[port]();
    }
    return model.inputData[port];
  }

  function setInputConnection(outputPort, port = 0) {
    if (model.deleted) {
      vtkErrorMacro('instance deleted - cannot call any method');
      return;
    }
    if (port >= model.numberOfInputs) {
      let msg = `algorithm ${publicAPI.getClassName()} only has `;
      msg += `${model.numberOfInputs}`;
      msg += ' input ports. To add more input ports, use addInputConnection()';
      vtkErrorMacro(msg);
      return;
    }
    model.inputData[port] = null;
    model.inputConnection[port] = outputPort;
  }

  function getInputConnection(port = 0) {
    return model.inputConnection[port];
  }

  function addInputConnection(outputPort) {
    if (model.deleted) {
      vtkErrorMacro('instance deleted - cannot call any method');
      return;
    }
    model.numberOfInputs++;
    setInputConnection(outputPort, model.numberOfInputs - 1);
  }

  function addInputData(dataset) {
    if (model.deleted) {
      vtkErrorMacro('instance deleted - cannot call any method');
      return;
    }
    model.numberOfInputs++;
    setInputData(dataset, model.numberOfInputs - 1);
  }

  function getOutputData(port = 0) {
    if (model.deleted) {
      vtkErrorMacro('instance deleted - cannot call any method');
      return null;
    }
    if (publicAPI.shouldUpdate()) {
      publicAPI.update();
    }
    return model.output[port];
  }

  publicAPI.shouldUpdate = () => {
    const localMTime = publicAPI.getMTime();
    let count = numberOfOutputs;
    let minOutputMTime = Infinity;
    while (count--) {
      if (!model.output[count]) {
        return true;
      }
      const mt = model.output[count].getMTime();
      if (mt < localMTime) {
        return true;
      }
      if (mt < minOutputMTime) {
        minOutputMTime = mt;
      }
    }

    count = model.numberOfInputs;
    while (count--) {
      if (
        model.inputConnection[count] &&
        model.inputConnection[count].filter.shouldUpdate()
      ) {
        return true;
      }
    }

    count = model.numberOfInputs;
    while (count--) {
      if (
        publicAPI.getInputData(count) &&
        publicAPI.getInputData(count).getMTime() > minOutputMTime
      ) {
        return true;
      }
    }
    return false;
  };

  function getOutputPort(port = 0) {
    const outputPortAccess = () => getOutputData(port);
    // Add reference to filter
    outputPortAccess.filter = publicAPI;
    return outputPortAccess;
  }

  // Handle input if needed
  if (model.numberOfInputs) {
    // Reserve inputs
    let count = model.numberOfInputs;
    while (count--) {
      model.inputData.push(null);
      model.inputConnection.push(null);
    }

    // Expose public methods
    publicAPI.setInputData = setInputData;
    publicAPI.setInputConnection = setInputConnection;
    publicAPI.addInputData = addInputData;
    publicAPI.addInputConnection = addInputConnection;
    publicAPI.getInputData = getInputData;
    publicAPI.getInputConnection = getInputConnection;
  }

  if (numberOfOutputs) {
    publicAPI.getOutputData = getOutputData;
    publicAPI.getOutputPort = getOutputPort;
  }

  publicAPI.update = () => {
    const ins = [];
    if (model.numberOfInputs) {
      let count = 0;
      while (count < model.numberOfInputs) {
        ins[count] = publicAPI.getInputData(count);
        count++;
      }
    }
    if (publicAPI.shouldUpdate() && publicAPI.requestData) {
      publicAPI.requestData(ins, model.output);
    }
  };

  publicAPI.getNumberOfInputPorts = () => model.numberOfInputs;
  publicAPI.getNumberOfOutputPorts = () =>
    numberOfOutputs || model.output.length;

  publicAPI.getInputArrayToProcess = (inputPort) => {
    const arrayDesc = model.inputArrayToProcess[inputPort];
    const ds = model.inputData[inputPort];
    if (arrayDesc && ds) {
      return ds[`get${arrayDesc.fieldAssociation}`]().getArray(
        arrayDesc.arrayName
      );
    }
    return null;
  };
  publicAPI.setInputArrayToProcess = (
    inputPort,
    arrayName,
    fieldAssociation,
    attributeType = 'Scalars'
  ) => {
    while (model.inputArrayToProcess.length < inputPort) {
      model.inputArrayToProcess.push(null);
    }
    model.inputArrayToProcess[inputPort] = {
      arrayName,
      fieldAssociation,
      attributeType,
    };
  };
}

// ----------------------------------------------------------------------------
// Event handling: onXXX(callback), invokeXXX(args...)
// ----------------------------------------------------------------------------

const EVENT_ABORT = Symbol('Event abort');

function event(publicAPI, model, eventName) {
  const callbacks = [];
  const previousDelete = publicAPI.delete;
  let curCallbackID = 1;

  function off(callbackID) {
    for (let i = 0; i < callbacks.length; ++i) {
      const [cbID] = callbacks[i];
      if (cbID === callbackID) {
        callbacks.splice(i, 1);
        return;
      }
    }
  }

  function on(callbackID) {
    function unsubscribe() {
      off(callbackID);
    }
    return Object.freeze({
      unsubscribe,
    });
  }

  function invoke() {
    if (model.deleted) {
      vtkErrorMacro('instance deleted - cannot call any method');
      return;
    }
    /* eslint-disable prefer-rest-params */
    // Go through a copy of the callbacks array in case new callbacks
    // get prepended within previous callbacks
    const currentCallbacks = callbacks.slice();
    for (let index = 0; index < currentCallbacks.length; ++index) {
      const [, cb, priority] = currentCallbacks[index];

      if (!cb) {
        continue; // eslint-disable-line
      }

      if (priority < 0) {
        setTimeout(() => cb.apply(publicAPI, arguments), 1 - priority);
      } else {
        // Abort only if the callback explicitly returns false
        const continueNext = cb.apply(publicAPI, arguments);
        if (continueNext === EVENT_ABORT) {
          break;
        }
      }
    }
    /* eslint-enable prefer-rest-params */
  }

  publicAPI[`invoke${capitalize(eventName)}`] = invoke;

  publicAPI[`on${capitalize(eventName)}`] = (callback, priority = 0.0) => {
    if (!callback.apply) {
      console.error(`Invalid callback for event ${eventName}`);
      return null;
    }

    if (model.deleted) {
      vtkErrorMacro('instance deleted - cannot call any method');
      return null;
    }

    const callbackID = curCallbackID++;
    callbacks.push([callbackID, callback, priority]);
    callbacks.sort((cb1, cb2) => cb2[2] - cb1[2]);
    return on(callbackID);
  };

  publicAPI.delete = () => {
    previousDelete();
    callbacks.forEach(([cbID]) => off(cbID));
  };
}

// ----------------------------------------------------------------------------
// newInstance
// ----------------------------------------------------------------------------

function newInstance(extend, className) {
  const constructor = (initialValues = {}) => {
    const model = {};
    const publicAPI = {};
    extend(publicAPI, model, initialValues);

    return Object.freeze(publicAPI);
  };

  // Register constructor to factory
  if (className) {
    _vtk__WEBPACK_IMPORTED_MODULE_0__.default.register(className, constructor);
  }

  return constructor;
}

// ----------------------------------------------------------------------------
// Chain function calls
// ----------------------------------------------------------------------------

function chain(...fn) {
  return (...args) => fn.filter((i) => !!i).map((i) => i(...args));
}

// ----------------------------------------------------------------------------
// Some utility methods for vtk objects
// ----------------------------------------------------------------------------

function isVtkObject(instance) {
  return instance && instance.isA && instance.isA('vtkObject');
}

function traverseInstanceTree(
  instance,
  extractFunction,
  accumulator = [],
  visitedInstances = []
) {
  if (isVtkObject(instance)) {
    if (visitedInstances.indexOf(instance) >= 0) {
      // avoid cycles
      return accumulator;
    }

    visitedInstances.push(instance);
    const result = extractFunction(instance);
    if (result !== undefined) {
      accumulator.push(result);
    }

    // Now go through this instance's model
    const model = instance.get();
    Object.keys(model).forEach((key) => {
      const modelObj = model[key];
      if (Array.isArray(modelObj)) {
        modelObj.forEach((subObj) => {
          traverseInstanceTree(
            subObj,
            extractFunction,
            accumulator,
            visitedInstances
          );
        });
      } else {
        traverseInstanceTree(
          modelObj,
          extractFunction,
          accumulator,
          visitedInstances
        );
      }
    });
  }

  return accumulator;
}

// ----------------------------------------------------------------------------
// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.

function debounce(func, wait, immediate) {
  let timeout;
  return (...args) => {
    const context = this;
    const later = () => {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
}

// ----------------------------------------------------------------------------
// Creates a throttled function that only invokes `func` at most once per
// every `wait` milliseconds.

function throttle(callback, delay) {
  let isThrottled = false;
  let argsToUse = null;

  function next() {
    isThrottled = false;
    if (argsToUse !== null) {
      wrapper(...argsToUse); // eslint-disable-line
      argsToUse = null;
    }
  }

  function wrapper(...args) {
    if (isThrottled) {
      argsToUse = args;
      return;
    }
    isThrottled = true;
    callback(...args);
    setTimeout(next, delay);
  }

  return wrapper;
}

// ----------------------------------------------------------------------------
// keystore(publicAPI, model, initialKeystore)
//
//    - initialKeystore: Initial keystore. This can be either a Map or an
//      object.
//
// Generated API
//  setKey(key, value) : mixed (returns value)
//  getKey(key) : mixed
//  getAllKeys() : [mixed]
//  deleteKey(key) : Boolean
// ----------------------------------------------------------------------------

function keystore(publicAPI, model, initialKeystore = {}) {
  model.keystore = Object.assign(model.keystore || {}, initialKeystore);

  publicAPI.setKey = (key, value) => {
    model.keystore[key] = value;
  };
  publicAPI.getKey = (key) => model.keystore[key];
  publicAPI.getAllKeys = () => Object.keys(model.keystore);
  publicAPI.deleteKey = (key) => delete model.keystore[key];
  publicAPI.clearKeystore = () =>
    publicAPI.getAllKeys().forEach((key) => delete model.keystore[key]);
}

// ----------------------------------------------------------------------------
// proxy(publicAPI, model, sectionName, propertyUI)
//
//    - sectionName: Name of the section for UI
//    - propertyUI: List of props with their UI description
//
// Generated API
//  getProxyId() : String
//  listProxyProperties() : [string]
//  updateProxyProperty(name, prop)
//  getProxySection() => List of properties for UI generation
// ----------------------------------------------------------------------------
let nextProxyId = 1;
const ROOT_GROUP_NAME = '__root__';

function proxy(publicAPI, model) {
  // Proxies are keystores
  keystore(publicAPI, model);

  const parentDelete = publicAPI.delete;

  // getProxyId
  model.proxyId = `${nextProxyId++}`;

  // ui handling
  model.ui = JSON.parse(JSON.stringify(model.ui || [])); // deep copy
  get(publicAPI, model, ['proxyId', 'proxyGroup', 'proxyName']);
  setGet(publicAPI, model, ['proxyManager']);

  // group properties
  const propertyMap = {};
  const groupChildrenNames = {};

  function registerProperties(descriptionList, currentGroupName) {
    if (!groupChildrenNames[currentGroupName]) {
      groupChildrenNames[currentGroupName] = [];
    }
    const childrenNames = groupChildrenNames[currentGroupName];

    for (let i = 0; i < descriptionList.length; i++) {
      childrenNames.push(descriptionList[i].name);
      propertyMap[descriptionList[i].name] = descriptionList[i];
      if (descriptionList[i].children && descriptionList[i].children.length) {
        registerProperties(
          descriptionList[i].children,
          descriptionList[i].name
        );
      }
    }
  }
  registerProperties(model.ui, ROOT_GROUP_NAME);

  publicAPI.updateUI = (ui) => {
    model.ui = JSON.parse(JSON.stringify(ui || [])); // deep copy
    Object.keys(propertyMap).forEach((k) => delete propertyMap[k]);
    Object.keys(groupChildrenNames).forEach(
      (k) => delete groupChildrenNames[k]
    );
    registerProperties(model.ui, ROOT_GROUP_NAME);
    publicAPI.modified();
  };

  function listProxyProperties(gName = ROOT_GROUP_NAME) {
    return groupChildrenNames[gName];
  }

  publicAPI.updateProxyProperty = (propertyName, propUI) => {
    const prop = propertyMap[propertyName];
    if (prop) {
      Object.assign(prop, propUI);
    } else {
      propertyMap[propertyName] = { ...propUI };
    }
  };

  publicAPI.activate = () => {
    if (model.proxyManager) {
      const setActiveMethod = `setActive${capitalize(
        publicAPI.getProxyGroup().slice(0, -1)
      )}`;
      if (model.proxyManager[setActiveMethod]) {
        model.proxyManager[setActiveMethod](publicAPI);
      }
    }
  };

  // property link
  model.propertyLinkSubscribers = {};
  publicAPI.registerPropertyLinkForGC = (otherLink, type) => {
    if (!(type in model.propertyLinkSubscribers)) {
      model.propertyLinkSubscribers[type] = [];
    }
    model.propertyLinkSubscribers[type].push(otherLink);
  };

  publicAPI.gcPropertyLinks = (type) => {
    const subscribers = model.propertyLinkSubscribers[type] || [];
    while (subscribers.length) {
      subscribers.pop().unbind(publicAPI);
    }
  };

  model.propertyLinkMap = {};
  publicAPI.getPropertyLink = (id, persistent = false) => {
    if (model.propertyLinkMap[id]) {
      return model.propertyLinkMap[id];
    }
    let value = null;
    const links = [];
    let count = 0;
    let updateInProgress = false;

    function update(source, force = false) {
      if (updateInProgress) {
        return null;
      }

      const needUpdate = [];
      let sourceLink = null;
      count = links.length;
      while (count--) {
        const link = links[count];
        if (link.instance === source) {
          sourceLink = link;
        } else {
          needUpdate.push(link);
        }
      }

      if (!sourceLink) {
        return null;
      }

      const newValue = sourceLink.instance[
        `get${capitalize(sourceLink.propertyName)}`
      ]();
      if (!shallowEquals(newValue, value) || force) {
        value = newValue;
        updateInProgress = true;
        while (needUpdate.length) {
          const linkToUpdate = needUpdate.pop();
          linkToUpdate.instance.set({
            [linkToUpdate.propertyName]: value,
          });
        }
        updateInProgress = false;
      }

      if (model.propertyLinkMap[id].persistent) {
        model.propertyLinkMap[id].value = newValue;
      }

      return newValue;
    }

    function unbind(instance, propertyName) {
      const indexToDelete = [];
      count = links.length;
      while (count--) {
        const link = links[count];
        if (
          link.instance === instance &&
          (link.propertyName === propertyName || propertyName === undefined)
        ) {
          link.subscription.unsubscribe();
          indexToDelete.push(count);
        }
      }
      while (indexToDelete.length) {
        links.splice(indexToDelete.pop(), 1);
      }
    }

    function bind(instance, propertyName, updateMe = false) {
      const subscription = instance.onModified(update);
      const other = links[0];
      links.push({
        instance,
        propertyName,
        subscription,
      });
      if (updateMe) {
        if (
          model.propertyLinkMap[id].persistent &&
          model.propertyLinkMap[id].value !== undefined
        ) {
          instance.set({
            [propertyName]: model.propertyLinkMap[id].value,
          });
        } else if (other) {
          update(other.instance, true);
        }
      }
      return {
        unsubscribe: () => unbind(instance, propertyName),
      };
    }

    function unsubscribe() {
      while (links.length) {
        links.pop().subscription.unsubscribe();
      }
    }

    const linkHandler = {
      bind,
      unbind,
      unsubscribe,
      persistent,
    };
    model.propertyLinkMap[id] = linkHandler;
    return linkHandler;
  };

  // extract values
  function getProperties(groupName = ROOT_GROUP_NAME) {
    const values = [];
    const id = model.proxyId;
    const propertyNames = listProxyProperties(groupName) || [];
    for (let i = 0; i < propertyNames.length; i++) {
      const name = propertyNames[i];
      const method = publicAPI[`get${capitalize(name)}`];
      const value = method ? method() : undefined;
      const prop = {
        id,
        name,
        value,
      };
      const children = getProperties(name);
      if (children.length) {
        prop.children = children;
      }
      values.push(prop);
    }
    return values;
  }

  publicAPI.listPropertyNames = () => getProperties().map((p) => p.name);

  publicAPI.getPropertyByName = (name) =>
    getProperties().find((p) => p.name === name);

  publicAPI.getPropertyDomainByName = (name) =>
    (propertyMap[name] || {}).domain;

  // ui section
  publicAPI.getProxySection = () => ({
    id: model.proxyId,
    name: model.proxyGroup,
    ui: model.ui,
    properties: getProperties(),
  });

  // free resources
  publicAPI.delete = () => {
    const list = Object.keys(model.propertyLinkMap);
    let count = list.length;
    while (count--) {
      model.propertyLinkMap[list[count]].unsubscribe();
    }
    Object.keys(model.propertyLinkSubscribers).forEach(
      publicAPI.gcPropertyLinks
    );
    parentDelete();
  };

  function registerLinks() {
    // Allow dynamic registration of links at the application level
    if (model.links) {
      for (let i = 0; i < model.links.length; i++) {
        const { link, property, persistent, updateOnBind, type } = model.links[
          i
        ];
        if (type === 'application') {
          const sLink = model.proxyManager.getPropertyLink(link, persistent);
          publicAPI.registerPropertyLinkForGC(sLink, 'application');
          sLink.bind(publicAPI, property, updateOnBind);
        }
      }
    }
  }
  setImmediateVTK(registerLinks);
}

// ----------------------------------------------------------------------------
// proxyPropertyMapping(publicAPI, model, map)
//
//   map = {
//      opacity: { modelKey: 'property', property: 'opacity' },
//   }
//
// Generated API:
//  Elevate set/get methods from internal object stored in the model to current one
// ----------------------------------------------------------------------------

function proxyPropertyMapping(publicAPI, model, map) {
  const parentDelete = publicAPI.delete;
  const subscriptions = [];

  const propertyNames = Object.keys(map);
  let count = propertyNames.length;
  while (count--) {
    const propertyName = propertyNames[count];
    const { modelKey, property, modified = true } = map[propertyName];
    const methodSrc = capitalize(property);
    const methodDst = capitalize(propertyName);
    publicAPI[`get${methodDst}`] = model[modelKey][`get${methodSrc}`];
    publicAPI[`set${methodDst}`] = model[modelKey][`set${methodSrc}`];
    if (modified) {
      subscriptions.push(model[modelKey].onModified(publicAPI.modified));
    }
  }

  publicAPI.delete = () => {
    while (subscriptions.length) {
      subscriptions.pop().unsubscribe();
    }
    parentDelete();
  };
}

// ----------------------------------------------------------------------------
// proxyPropertyState(publicAPI, model, state, defaults)
//
//   state = {
//     representation: {
//       'Surface with edges': { property: { edgeVisibility: true, representation: 2 } },
//       Surface: { property: { edgeVisibility: false, representation: 2 } },
//       Wireframe: { property: { edgeVisibility: false, representation: 1 } },
//       Points: { property: { edgeVisibility: false, representation: 0 } },
//     },
//   }
//
//   defaults = {
//      representation: 'Surface',
//   }
//
// Generated API
//   get / set Representation ( string ) => push state to various internal objects
// ----------------------------------------------------------------------------

function proxyPropertyState(
  publicAPI,
  model,
  state = {},
  defaults = {}
) {
  model.this = publicAPI;

  function applyState(map) {
    const modelKeys = Object.keys(map);
    let count = modelKeys.length;
    while (count--) {
      const modelKey = modelKeys[count];
      model[modelKey].set(map[modelKey]);
    }
  }

  const modelKeys = Object.keys(defaults);
  let count = modelKeys.length;
  while (count--) {
    // Add default
    const key = modelKeys[count];
    model[key] = defaults[key];

    // Add set method
    const mapping = state[key];
    publicAPI[`set${capitalize(key)}`] = (value) => {
      if (value !== model[key]) {
        model[key] = value;
        const propValues = mapping[value];
        applyState(propValues);
        publicAPI.modified();
      }
    };
  }

  // Add getter
  if (modelKeys.length) {
    get(publicAPI, model, modelKeys);
  }
}

// ----------------------------------------------------------------------------
// From : https://github.com/facebookarchive/fixed-data-table/blob/master/src/vendor_upstream/dom/normalizeWheel.js
//
//
// Copyright (c) 2015, Facebook, Inc.
// All rights reserved.
//
// This source code is licensed under the BSD-style license found in the
// LICENSE file in the root directory of this source tree. An additional grant
// of patent rights can be found in the PATENTS file in the same directory.
//
//
// Mouse wheel (and 2-finger trackpad) support on the web sucks.  It is
// complicated, thus this doc is long and (hopefully) detailed enough to answer
// your questions.
//
// If you need to react to the mouse wheel in a predictable way, this code is
// like your bestest friend.// hugs//
//
// As of today, there are 4 DOM event types you can listen to:
//
//   'wheel'                -- Chrome(31+), FF(17+), IE(9+)
//   'mousewheel'           -- Chrome, IE(6+), Opera, Safari
//   'MozMousePixelScroll'  -- FF(3.5 only!) (2010-2013) -- don't bother!
//   'DOMMouseScroll'       -- FF(0.9.7+) since 2003
//
// So what to do?  The is the best:
//
//   normalizeWheel.getEventType();
//
// In your event callback, use this code to get sane interpretation of the
// deltas.  This code will return an object with properties:
//
//   spinX   -- normalized spin speed (use for zoom) - x plane
//   spinY   -- " - y plane
//   pixelX  -- normalized distance (to pixels) - x plane
//   pixelY  -- " - y plane
//
// Wheel values are provided by the browser assuming you are using the wheel to
// scroll a web page by a number of lines or pixels (or pages).  Values can vary
// significantly on different platforms and browsers, forgetting that you can
// scroll at different speeds.  Some devices (like trackpads) emit more events
// at smaller increments with fine granularity, and some emit massive jumps with
// linear speed or acceleration.
//
// This code does its best to normalize the deltas for you:
//
//   - spin is trying to normalize how far the wheel was spun (or trackpad
//     dragged).  This is super useful for zoom support where you want to
//     throw away the chunky scroll steps on the PC and make those equal to
//     the slow and smooth tiny steps on the Mac. Key data: This code tries to
//     resolve a single slow step on a wheel to 1.
//
//   - pixel is normalizing the desired scroll delta in pixel units.  You'll
//     get the crazy differences between browsers, but at least it'll be in
//     pixels!
//
//   - positive value indicates scrolling DOWN/RIGHT, negative UP/LEFT.  This
//     should translate to positive value zooming IN, negative zooming OUT.
//     This matches the newer 'wheel' event.
//
// Why are there spinX, spinY (or pixels)?
//
//   - spinX is a 2-finger side drag on the trackpad, and a shift + wheel turn
//     with a mouse.  It results in side-scrolling in the browser by default.
//
//   - spinY is what you expect -- it's the classic axis of a mouse wheel.
//
//   - I dropped spinZ/pixelZ.  It is supported by the DOM 3 'wheel' event and
//     probably is by browsers in conjunction with fancy 3D controllers .. but
//     you know.
//
// Implementation info:
//
// Examples of 'wheel' event if you scroll slowly (down) by one step with an
// average mouse:
//
//   OS X + Chrome  (mouse)     -    4   pixel delta  (wheelDelta -120)
//   OS X + Safari  (mouse)     -  N/A   pixel delta  (wheelDelta  -12)
//   OS X + Firefox (mouse)     -    0.1 line  delta  (wheelDelta  N/A)
//   Win8 + Chrome  (mouse)     -  100   pixel delta  (wheelDelta -120)
//   Win8 + Firefox (mouse)     -    3   line  delta  (wheelDelta -120)
//
// On the trackpad:
//
//   OS X + Chrome  (trackpad)  -    2   pixel delta  (wheelDelta   -6)
//   OS X + Firefox (trackpad)  -    1   pixel delta  (wheelDelta  N/A)
//
// On other/older browsers.. it's more complicated as there can be multiple and
// also missing delta values.
//
// The 'wheel' event is more standard:
//
// http://www.w3.org/TR/DOM-Level-3-Events/#events-wheelevents
//
// The basics is that it includes a unit, deltaMode (pixels, lines, pages), and
// deltaX, deltaY and deltaZ.  Some browsers provide other values to maintain
// backward compatibility with older events.  Those other values help us
// better normalize spin speed.  Example of what the browsers provide:
//
//                          | event.wheelDelta | event.detail
//        ------------------+------------------+--------------
//          Safari v5/OS X  |       -120       |       0
//          Safari v5/Win7  |       -120       |       0
//         Chrome v17/OS X  |       -120       |       0
//         Chrome v17/Win7  |       -120       |       0
//                IE9/Win7  |       -120       |   undefined
//         Firefox v4/OS X  |     undefined    |       1
//         Firefox v4/Win7  |     undefined    |       3
//
// ----------------------------------------------------------------------------

// Reasonable defaults
const PIXEL_STEP = 10;
const LINE_HEIGHT = 40;
const PAGE_HEIGHT = 800;

function normalizeWheel(wheelEvent) {
  let sX = 0; // spinX
  let sY = 0; // spinY
  let pX = 0; // pixelX
  let pY = 0; // pixelY

  // Legacy
  if ('detail' in wheelEvent) {
    sY = wheelEvent.detail;
  }
  if ('wheelDelta' in wheelEvent) {
    sY = -wheelEvent.wheelDelta / 120;
  }
  if ('wheelDeltaY' in wheelEvent) {
    sY = -wheelEvent.wheelDeltaY / 120;
  }
  if ('wheelDeltaX' in wheelEvent) {
    sX = -wheelEvent.wheelDeltaX / 120;
  }

  // side scrolling on FF with DOMMouseScroll
  if ('axis' in wheelEvent && wheelEvent.axis === wheelEvent.HORIZONTAL_AXIS) {
    sX = sY;
    sY = 0;
  }

  pX = sX * PIXEL_STEP;
  pY = sY * PIXEL_STEP;

  if ('deltaY' in wheelEvent) {
    pY = wheelEvent.deltaY;
  }
  if ('deltaX' in wheelEvent) {
    pX = wheelEvent.deltaX;
  }

  if ((pX || pY) && wheelEvent.deltaMode) {
    if (wheelEvent.deltaMode === 1) {
      // delta in LINE units
      pX *= LINE_HEIGHT;
      pY *= LINE_HEIGHT;
    } else {
      // delta in PAGE units
      pX *= PAGE_HEIGHT;
      pY *= PAGE_HEIGHT;
    }
  }

  // Fall-back if spin cannot be determined
  if (pX && !sX) {
    sX = pX < 1 ? -1 : 1;
  }
  if (pY && !sY) {
    sY = pY < 1 ? -1 : 1;
  }

  return {
    spinX: sX,
    spinY: sY,
    pixelX: pX,
    pixelY: pY,
  };
}

// ----------------------------------------------------------------------------
// Default export
// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  algo,
  capitalize,
  chain,
  debounce,
  enumToString,
  event,
  EVENT_ABORT,
  formatBytesToProperUnit,
  formatNumbersWithThousandSeparator,
  get,
  getArray,
  getCurrentGlobalMTime,
  getStateArrayMapFunc,
  isVtkObject,
  keystore,
  newInstance,
  normalizeWheel,
  obj,
  proxy,
  proxyPropertyMapping,
  proxyPropertyState,
  safeArrays,
  set,
  setArray,
  setGet,
  setGetArray,
  setImmediate: setImmediateVTK,
  setLoggerFunction,
  throttle,
  traverseInstanceTree,
  TYPED_ARRAYS,
  uncapitalize,
  VOID,
  vtkDebugMacro,
  vtkErrorMacro,
  vtkInfoMacro,
  vtkLogMacro,
  vtkOnceErrorMacro,
  vtkWarningMacro,
});


/***/ }),
/* 15 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ vtk)
/* harmony export */ });
const factoryMapping = {
  vtkObject: () => null,
};

function vtk(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (obj.isA) {
    return obj;
  }
  if (!obj.vtkClass) {
    if (__webpack_require__.g.console && __webpack_require__.g.console.error) {
      __webpack_require__.g.console.error('Invalid VTK object');
    }
    return null;
  }
  const constructor = factoryMapping[obj.vtkClass];
  if (!constructor) {
    if (__webpack_require__.g.console && __webpack_require__.g.console.error) {
      __webpack_require__.g.console.error(
        `No vtk class found for Object of type ${obj.vtkClass}`
      );
    }
    return null;
  }

  // Shallow copy object
  const model = { ...obj };

  // Convert into vtkObject any nested key
  Object.keys(model).forEach((keyName) => {
    if (
      model[keyName] &&
      typeof model[keyName] === 'object' &&
      model[keyName].vtkClass
    ) {
      model[keyName] = vtk(model[keyName]);
    }
  });

  // Return the root
  const newInst = constructor(model);
  if (newInst && newInst.modified) {
    newInst.modified();
  }
  return newInst;
}

function register(vtkClassName, constructor) {
  factoryMapping[vtkClassName] = constructor;
}

// Nest register method under the vtk function
vtk.register = register;


/***/ }),
/* 16 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "STATIC": () => (/* binding */ STATIC),
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(17);
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(14);
/* harmony import */ var vtk_js_Sources_Common_DataModel_Plane__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(27);




const INIT_BOUNDS = [
  Number.MAX_VALUE,
  -Number.MAX_VALUE, // X
  Number.MAX_VALUE,
  -Number.MAX_VALUE, // Y
  Number.MAX_VALUE,
  -Number.MAX_VALUE, // Z
];

// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

function isValid(bounds) {
  return (
    bounds[0] <= bounds[1] && bounds[2] <= bounds[3] && bounds[4] <= bounds[5]
  );
}

function getCenter(bounds) {
  return [
    0.5 * (bounds[0] + bounds[1]),
    0.5 * (bounds[2] + bounds[3]),
    0.5 * (bounds[4] + bounds[5]),
  ];
}

function getLength(bounds, index) {
  return bounds[index * 2 + 1] - bounds[index * 2];
}

function getLengths(bounds) {
  return [getLength(bounds, 0), getLength(bounds, 1), getLength(bounds, 2)];
}

function getXRange(bounds) {
  return bounds.slice(0, 2);
}

function getYRange(bounds) {
  return bounds.slice(2, 4);
}

function getZRange(bounds) {
  return bounds.slice(4, 6);
}

function getMaxLength(bounds) {
  const l = getLengths(bounds);
  if (l[0] > l[1]) {
    if (l[0] > l[2]) {
      return l[0];
    }
    return l[2];
  }

  if (l[1] > l[2]) {
    return l[1];
  }

  return l[2];
}

function getDiagonalLength(bounds) {
  if (isValid(bounds)) {
    const l = getLengths(bounds);
    return Math.sqrt(l[0] * l[0] + l[1] * l[1] + l[2] * l[2]);
  }
  return null;
}

function oppositeSign(a, b) {
  return (a <= 0 && b >= 0) || (a >= 0 && b <= 0);
}

function getCorners(bounds, corners) {
  let count = 0;
  for (let ix = 0; ix < 2; ix++) {
    for (let iy = 2; iy < 4; iy++) {
      for (let iz = 4; iz < 6; iz++) {
        corners[count] = [bounds[ix], bounds[iy], bounds[iz]];
        count++;
      }
    }
  }
}

// Computes the two corners with minimal and miximal coordinates
function computeCornerPoints(point1, point2, bounds) {
  point1[0] = bounds[0];
  point1[1] = bounds[2];
  point1[2] = bounds[4];

  point2[0] = bounds[1];
  point2[1] = bounds[3];
  point2[2] = bounds[5];
}

function computeScale3(bounds, scale3 = []) {
  const center = getCenter(bounds);
  scale3[0] = bounds[1] - center[0];
  scale3[1] = bounds[3] - center[1];
  scale3[2] = bounds[5] - center[2];

  return scale3;
}

/**
 * Compute local bounds.
 * Not as fast as vtkPoints.getBounds() if u, v, w form a natural basis.
 * @param {vtkPoints} points
 * @param {array} u first vector
 * @param {array} v second vector
 * @param {array} w third vector
 */
function computeLocalBounds(points, u, v, w) {
  const bounds = [].concat(INIT_BOUNDS);
  const pointsData = points.getData();
  for (let i = 0; i < pointsData.length; i += 3) {
    const point = [pointsData[i], pointsData[i + 1], pointsData[i + 2]];
    const du = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.dot(point, u);
    bounds[0] = Math.min(du, bounds[0]);
    bounds[1] = Math.max(du, bounds[1]);
    const dv = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.dot(point, v);
    bounds[2] = Math.min(dv, bounds[2]);
    bounds[3] = Math.max(dv, bounds[3]);
    const dw = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.dot(point, w);
    bounds[4] = Math.min(dw, bounds[4]);
    bounds[5] = Math.max(dw, bounds[5]);
  }
  return bounds;
}

// ----------------------------------------------------------------------------
// Static API
// ----------------------------------------------------------------------------

const STATIC = {
  isValid,
  getCenter,
  getLength,
  getLengths,
  getMaxLength,
  getDiagonalLength,
  getXRange,
  getYRange,
  getZRange,
  getCorners,
  computeCornerPoints,
  computeLocalBounds,
  computeScale3,
  INIT_BOUNDS,
};

// ----------------------------------------------------------------------------
// vtkBoundingBox methods
// ----------------------------------------------------------------------------

function vtkBoundingBox(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkBoundingBox');

  publicAPI.clone = () => {
    const bounds = [].concat(model.bounds);
    /* eslint-disable no-use-before-define */
    return newInstance({ bounds });
    /* eslint-enable no-use-before-define */
  };

  publicAPI.equals = (other) => {
    const a = model.bounds;
    const b = other.getBounds();
    return (
      a[0] === b[0] &&
      a[1] === b[1] &&
      a[2] === b[2] &&
      a[3] === b[3] &&
      a[4] === b[4] &&
      a[5] === b[5]
    );
  };

  publicAPI.setMinPoint = (x, y, z) => {
    const [xMin, xMax, yMin, yMax, zMin, zMax] = model.bounds;
    model.bounds = [
      x,
      x > xMax ? x : xMax,
      y,
      y > yMax ? y : yMax,
      z,
      z > zMax ? z : zMax,
    ];

    return xMin !== x || yMin !== y || zMin !== z;
  };

  publicAPI.setMaxPoint = (x, y, z) => {
    const [xMin, xMax, yMin, yMax, zMin, zMax] = model.bounds;
    model.bounds = [
      x < xMin ? x : xMin,
      x,
      y < yMin ? y : yMin,
      y,
      z < zMin ? z : zMin,
      z,
    ];

    return xMax !== x || yMax !== y || zMax !== z;
  };

  publicAPI.addPoint = (...xyz) => {
    model.bounds = model.bounds.map((value, index) => {
      if (index % 2 === 0) {
        const idx = index / 2;
        return value < xyz[idx] ? value : xyz[idx];
      }
      const idx = (index - 1) / 2;
      return value > xyz[idx] ? value : xyz[idx];
    });
  };

  publicAPI.addBounds = (xMin, xMax, yMin, yMax, zMin, zMax) => {
    const [_xMin, _xMax, _yMin, _yMax, _zMin, _zMax] = model.bounds;
    if (zMax === undefined) {
      model.bounds = [
        Math.min(xMin[0], _xMin),
        Math.max(xMin[1], _xMax),
        Math.min(xMin[2], _yMin),
        Math.max(xMin[3], _yMax),
        Math.min(xMin[4], _zMin),
        Math.max(xMin[5], _zMax),
      ];
    } else {
      model.bounds = [
        Math.min(xMin, _xMin),
        Math.max(xMax, _xMax),
        Math.min(yMin, _yMin),
        Math.max(yMax, _yMax),
        Math.min(zMin, _zMin),
        Math.max(zMax, _zMax),
      ];
    }
  };

  publicAPI.addBox = (other) => {
    publicAPI.addBounds(other.getBounds());
  };

  publicAPI.isValid = () => isValid(model.bounds);

  publicAPI.intersect = (bbox) => {
    if (!(publicAPI.isValid() && bbox.isValid())) {
      return false;
    }

    const newBounds = [0, 0, 0, 0, 0, 0];
    const bBounds = bbox.getBounds();
    let intersects;
    for (let i = 0; i < 3; i++) {
      intersects = false;
      if (
        bBounds[i * 2] >= model.bounds[i * 2] &&
        bBounds[i * 2] <= model.bounds[i * 2 + 1]
      ) {
        intersects = true;
        newBounds[i * 2] = bBounds[i * 2];
      } else if (
        model.bounds[i * 2] >= bBounds[i * 2] &&
        model.bounds[i * 2] <= bBounds[i * 2 + 1]
      ) {
        intersects = true;
        newBounds[i * 2] = model.bounds[i * 2];
      }

      if (
        bBounds[i * 2 + 1] >= model.bounds[i * 2] &&
        bBounds[i * 2 + 1] <= model.bounds[i * 2 + 1]
      ) {
        intersects = true;
        newBounds[i * 2 + 1] = bbox.MaxPnt[i];
      } else if (
        model.bounds[i * 2 + 1] >= bbox.MinPnt[i * 2] &&
        model.bounds[i * 2 + 1] <= bbox.MaxPnt[i * 2 + 1]
      ) {
        intersects = true;
        newBounds[i * 2 + 1] = model.bounds[i * 2 + 1];
      }

      if (!intersects) {
        return false;
      }
    }

    // OK they did intersect - set the box to be the result
    model.bounds = newBounds;
    return true;
  };

  publicAPI.intersects = (bbox) => {
    if (!(publicAPI.isValid() && bbox.isValid())) {
      return false;
    }
    const bBounds = bbox.getBounds();
    /* eslint-disable no-continue */
    for (let i = 0; i < 3; i++) {
      if (
        bBounds[i * 2] >= model.bounds[i * 2] &&
        bBounds[i * 2] <= model.bounds[i * 2 + 1]
      ) {
        continue;
      } else if (
        model.bounds[i * 2] >= bBounds[i * 2] &&
        model.bounds[i * 2] <= bBounds[i * 2 + 1]
      ) {
        continue;
      }

      if (
        bBounds[i * 2 + 1] >= model.bounds[i * 2] &&
        bBounds[i * 2 + 1] <= model.bounds[i * 2 + 1]
      ) {
        continue;
      } else if (
        model.bounds[i * 2 + 1] >= bbox.MinPnt[i * 2] &&
        model.bounds[i * 2 + 1] <= bbox.MaxPnt[i * 2 + 1]
      ) {
        continue;
      }
      return false;
    }
    /* eslint-enable no-continue */

    return true;
  };

  /**
   * Returns true if plane intersects bounding box.
   * If so, the box is cut by the plane
   * @param {array} origin
   * @param {array} normal
   */
  publicAPI.intersectPlane = (origin, normal) => {
    // Index[0..2] represents the order of traversing the corners of a cube
    // in (x,y,z), (y,x,z) and (z,x,y) ordering, respectively
    const index = [
      [0, 1, 2, 3, 4, 5, 6, 7],
      [0, 1, 4, 5, 2, 3, 6, 7],
      [0, 2, 4, 6, 1, 3, 5, 7],
    ];

    // stores the signed distance to a plane
    const d = [0, 0, 0, 0, 0, 0, 0, 0];
    let idx = 0;
    for (let ix = 0; ix < 2; ix++) {
      for (let iy = 2; iy < 4; iy++) {
        for (let iz = 4; iz < 6; iz++) {
          const x = [model.bounds[ix], model.bounds[iy], model.bounds[iz]];
          d[idx++] = vtk_js_Sources_Common_DataModel_Plane__WEBPACK_IMPORTED_MODULE_2__.default.evaluate(normal, origin, x);
        }
      }
    }

    let dir = 2;
    while (dir--) {
      // in each direction, we test if the vertices of two orthogonal faces
      // are on either side of the plane
      if (
        oppositeSign(d[index[dir][0]], d[index[dir][4]]) &&
        oppositeSign(d[index[dir][1]], d[index[dir][5]]) &&
        oppositeSign(d[index[dir][2]], d[index[dir][6]]) &&
        oppositeSign(d[index[dir][3]], d[index[dir][7]])
      ) {
        break;
      }
    }

    if (dir < 0) {
      return false;
    }

    const sign = Math.sign(normal[dir]);
    const size = Math.abs(
      (model.bounds[dir * 2 + 1] - model.bounds[dir * 2]) * normal[dir]
    );
    let t = sign > 0 ? 1 : 0;
    /* eslint-disable no-continue */
    for (let i = 0; i < 4; i++) {
      if (size === 0) {
        continue; // shouldn't happen
      }
      const ti = Math.abs(d[index[dir][i]]) / size;
      if (sign > 0 && ti < t) {
        t = ti;
      }

      if (sign < 0 && ti > t) {
        t = ti;
      }
    }
    /* eslint-enable no-continue */
    const bound =
      (1.0 - t) * model.bounds[dir * 2] + t * model.bounds[dir * 2 + 1];

    if (sign > 0) {
      model.bounds[dir * 2] = bound;
    } else {
      model.bounds[dir * 2 + 1] = bound;
    }

    return true;
  };

  publicAPI.containsPoint = (x, y, z) => {
    if (x < model.bounds[0] || x > model.bounds[1]) {
      return false;
    }

    if (y < model.bounds[2] || y > model.bounds[3]) {
      return false;
    }

    if (z < model.bounds[4] || z > model.bounds[5]) {
      return false;
    }

    return true;
  };

  publicAPI.getMinPoint = () => [
    model.bounds[0],
    model.bounds[2],
    model.bounds[4],
  ];
  publicAPI.getMaxPoint = () => [
    model.bounds[1],
    model.bounds[3],
    model.bounds[5],
  ];
  publicAPI.getBound = (index) => model.bound[index];

  publicAPI.contains = (bbox) => {
    // if either box is not valid or they don't intersect
    if (!publicAPI.intersects(bbox)) {
      return false;
    }

    if (!publicAPI.containsPoint(...bbox.getMinPoint())) {
      return false;
    }

    if (!publicAPI.containsPoint(...bbox.getMaxPoint())) {
      return 0;
    }

    return true;
  };

  publicAPI.getCenter = () => getCenter(model.bounds);
  publicAPI.getLength = (index) => getLength(model.bounds, index);
  publicAPI.getLengths = () => getLengths(model.bounds);
  publicAPI.getMaxLength = () => getMaxLength(model.bounds);
  publicAPI.getDiagonalLength = () => getDiagonalLength(model.bounds);

  publicAPI.reset = () => publicAPI.setBounds([].concat(INIT_BOUNDS));

  publicAPI.inflate = (delta) => {
    model.bounds = model.bounds.map((value, index) => {
      if (index % 2 === 0) {
        return value - delta;
      }
      return value + delta;
    });
  };

  publicAPI.getCorners = () => {
    getCorners(model.bounds, model.corners);
    return model.corners;
  };

  publicAPI.scale = (sx, sy, sz) => {
    if (publicAPI.isValid()) {
      const newBounds = [].concat(model.bounds);
      if (sx >= 0.0) {
        newBounds[0] *= sx;
        newBounds[1] *= sx;
      } else {
        newBounds[0] = sx * model.bounds[1];
        newBounds[1] = sx * model.bounds[0];
      }

      if (sy >= 0.0) {
        newBounds[2] *= sy;
        newBounds[3] *= sy;
      } else {
        newBounds[2] = sy * model.bounds[3];
        newBounds[3] = sy * model.bounds[2];
      }

      if (sz >= 0.0) {
        newBounds[4] *= sz;
        newBounds[5] *= sz;
      } else {
        newBounds[4] = sz * model.bounds[5];
        newBounds[5] = sz * model.bounds[4];
      }

      model.bounds = newBounds;
      return true;
    }
    return false;
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  type: 'vtkBoundingBox',
  bounds: [].concat(INIT_BOUNDS),
  corners: [],
};

// ----------------------------------------------------------------------------

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Object methods
  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__.default.obj(publicAPI, model);
  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__.default.setGet(publicAPI, model, ['bounds']);
  vtkBoundingBox(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__.default.newInstance(extend, 'vtkBoundingBox');

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend, ...STATIC });


/***/ }),
/* 17 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Pi": () => (/* binding */ Pi),
/* harmony export */   "radiansFromDegrees": () => (/* binding */ radiansFromDegrees),
/* harmony export */   "degreesFromRadians": () => (/* binding */ degreesFromRadians),
/* harmony export */   "round": () => (/* binding */ round),
/* harmony export */   "floor": () => (/* binding */ floor),
/* harmony export */   "ceil": () => (/* binding */ ceil),
/* harmony export */   "min": () => (/* binding */ min),
/* harmony export */   "max": () => (/* binding */ max),
/* harmony export */   "arrayMin": () => (/* binding */ arrayMin),
/* harmony export */   "arrayMax": () => (/* binding */ arrayMax),
/* harmony export */   "arrayRange": () => (/* binding */ arrayRange),
/* harmony export */   "ceilLog2": () => (/* binding */ ceilLog2),
/* harmony export */   "factorial": () => (/* binding */ factorial),
/* harmony export */   "nearestPowerOfTwo": () => (/* binding */ nearestPowerOfTwo),
/* harmony export */   "isPowerOfTwo": () => (/* binding */ isPowerOfTwo),
/* harmony export */   "binomial": () => (/* binding */ binomial),
/* harmony export */   "beginCombination": () => (/* binding */ beginCombination),
/* harmony export */   "nextCombination": () => (/* binding */ nextCombination),
/* harmony export */   "randomSeed": () => (/* binding */ randomSeed),
/* harmony export */   "getSeed": () => (/* binding */ getSeed),
/* harmony export */   "random": () => (/* binding */ random),
/* harmony export */   "gaussian": () => (/* binding */ gaussian),
/* harmony export */   "add": () => (/* binding */ add),
/* harmony export */   "subtract": () => (/* binding */ subtract),
/* harmony export */   "multiplyScalar": () => (/* binding */ multiplyScalar),
/* harmony export */   "multiplyScalar2D": () => (/* binding */ multiplyScalar2D),
/* harmony export */   "multiplyAccumulate": () => (/* binding */ multiplyAccumulate),
/* harmony export */   "multiplyAccumulate2D": () => (/* binding */ multiplyAccumulate2D),
/* harmony export */   "dot": () => (/* binding */ dot),
/* harmony export */   "outer": () => (/* binding */ outer),
/* harmony export */   "cross": () => (/* binding */ cross),
/* harmony export */   "norm": () => (/* binding */ norm),
/* harmony export */   "normalize": () => (/* binding */ normalize),
/* harmony export */   "perpendiculars": () => (/* binding */ perpendiculars),
/* harmony export */   "projectVector": () => (/* binding */ projectVector),
/* harmony export */   "dot2D": () => (/* binding */ dot2D),
/* harmony export */   "projectVector2D": () => (/* binding */ projectVector2D),
/* harmony export */   "distance2BetweenPoints": () => (/* binding */ distance2BetweenPoints),
/* harmony export */   "angleBetweenVectors": () => (/* binding */ angleBetweenVectors),
/* harmony export */   "gaussianAmplitude": () => (/* binding */ gaussianAmplitude),
/* harmony export */   "gaussianWeight": () => (/* binding */ gaussianWeight),
/* harmony export */   "outer2D": () => (/* binding */ outer2D),
/* harmony export */   "norm2D": () => (/* binding */ norm2D),
/* harmony export */   "normalize2D": () => (/* binding */ normalize2D),
/* harmony export */   "determinant2x2": () => (/* binding */ determinant2x2),
/* harmony export */   "LUFactor3x3": () => (/* binding */ LUFactor3x3),
/* harmony export */   "LUSolve3x3": () => (/* binding */ LUSolve3x3),
/* harmony export */   "linearSolve3x3": () => (/* binding */ linearSolve3x3),
/* harmony export */   "multiply3x3_vect3": () => (/* binding */ multiply3x3_vect3),
/* harmony export */   "multiply3x3_mat3": () => (/* binding */ multiply3x3_mat3),
/* harmony export */   "multiplyMatrix": () => (/* binding */ multiplyMatrix),
/* harmony export */   "transpose3x3": () => (/* binding */ transpose3x3),
/* harmony export */   "invert3x3": () => (/* binding */ invert3x3),
/* harmony export */   "identity3x3": () => (/* binding */ identity3x3),
/* harmony export */   "determinant3x3": () => (/* binding */ determinant3x3),
/* harmony export */   "quaternionToMatrix3x3": () => (/* binding */ quaternionToMatrix3x3),
/* harmony export */   "areEquals": () => (/* binding */ areEquals),
/* harmony export */   "areMatricesEqual": () => (/* binding */ areMatricesEqual),
/* harmony export */   "jacobiN": () => (/* binding */ jacobiN),
/* harmony export */   "matrix3x3ToQuaternion": () => (/* binding */ matrix3x3ToQuaternion),
/* harmony export */   "multiplyQuaternion": () => (/* binding */ multiplyQuaternion),
/* harmony export */   "orthogonalize3x3": () => (/* binding */ orthogonalize3x3),
/* harmony export */   "diagonalize3x3": () => (/* binding */ diagonalize3x3),
/* harmony export */   "singularValueDecomposition3x3": () => (/* binding */ singularValueDecomposition3x3),
/* harmony export */   "luFactorLinearSystem": () => (/* binding */ luFactorLinearSystem),
/* harmony export */   "luSolveLinearSystem": () => (/* binding */ luSolveLinearSystem),
/* harmony export */   "solveLinearSystem": () => (/* binding */ solveLinearSystem),
/* harmony export */   "invertMatrix": () => (/* binding */ invertMatrix),
/* harmony export */   "estimateMatrixCondition": () => (/* binding */ estimateMatrixCondition),
/* harmony export */   "jacobi": () => (/* binding */ jacobi),
/* harmony export */   "solveHomogeneousLeastSquares": () => (/* binding */ solveHomogeneousLeastSquares),
/* harmony export */   "solveLeastSquares": () => (/* binding */ solveLeastSquares),
/* harmony export */   "hex2float": () => (/* binding */ hex2float),
/* harmony export */   "rgb2hsv": () => (/* binding */ rgb2hsv),
/* harmony export */   "hsv2rgb": () => (/* binding */ hsv2rgb),
/* harmony export */   "lab2xyz": () => (/* binding */ lab2xyz),
/* harmony export */   "xyz2lab": () => (/* binding */ xyz2lab),
/* harmony export */   "xyz2rgb": () => (/* binding */ xyz2rgb),
/* harmony export */   "rgb2xyz": () => (/* binding */ rgb2xyz),
/* harmony export */   "rgb2lab": () => (/* binding */ rgb2lab),
/* harmony export */   "lab2rgb": () => (/* binding */ lab2rgb),
/* harmony export */   "uninitializeBounds": () => (/* binding */ uninitializeBounds),
/* harmony export */   "areBoundsInitialized": () => (/* binding */ areBoundsInitialized),
/* harmony export */   "computeBoundsFromPoints": () => (/* binding */ computeBoundsFromPoints),
/* harmony export */   "clampValue": () => (/* binding */ clampValue),
/* harmony export */   "clampVector": () => (/* binding */ clampVector),
/* harmony export */   "roundVector": () => (/* binding */ roundVector),
/* harmony export */   "clampAndNormalizeValue": () => (/* binding */ clampAndNormalizeValue),
/* harmony export */   "getScalarTypeFittingRange": () => (/* binding */ getScalarTypeFittingRange),
/* harmony export */   "getAdjustedScalarRange": () => (/* binding */ getAdjustedScalarRange),
/* harmony export */   "extentIsWithinOtherExtent": () => (/* binding */ extentIsWithinOtherExtent),
/* harmony export */   "boundsIsWithinOtherBounds": () => (/* binding */ boundsIsWithinOtherBounds),
/* harmony export */   "pointIsWithinBounds": () => (/* binding */ pointIsWithinBounds),
/* harmony export */   "solve3PointCircle": () => (/* binding */ solve3PointCircle),
/* harmony export */   "inf": () => (/* binding */ inf),
/* harmony export */   "negInf": () => (/* binding */ negInf),
/* harmony export */   "isInf": () => (/* binding */ isInf),
/* harmony export */   "isFinite": () => (/* binding */ isFinite),
/* harmony export */   "isNaN": () => (/* binding */ isNaN),
/* harmony export */   "isNan": () => (/* binding */ isNan),
/* harmony export */   "createUninitializedBounds": () => (/* binding */ createUninitializedBounds),
/* harmony export */   "getMajorAxisIndex": () => (/* binding */ getMajorAxisIndex),
/* harmony export */   "floatToHex2": () => (/* binding */ floatToHex2),
/* harmony export */   "floatRGB2HexCode": () => (/* binding */ floatRGB2HexCode),
/* harmony export */   "float2CssRGBA": () => (/* binding */ float2CssRGBA),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var seedrandom__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(18);
/* harmony import */ var seedrandom__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(seedrandom__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(14);



const { vtkErrorMacro, vtkWarningMacro } = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__.default;

// ----------------------------------------------------------------------------
/* eslint-disable camelcase                                                  */
/* eslint-disable no-cond-assign                                             */
/* eslint-disable no-bitwise                                                 */
/* eslint-disable no-multi-assign                                            */
// ----------------------------------------------------------------------------
let randomSeedValue = 0;
const VTK_MAX_ROTATIONS = 20;
const VTK_SMALL_NUMBER = 1.0e-12;

function notImplemented(method) {
  return () => vtkErrorMacro(`vtkMath::${method} - NOT IMPLEMENTED`);
}

function vtkSwapVectors3(v1, v2) {
  for (let i = 0; i < 3; i++) {
    const tmp = v1[i];
    v1[i] = v2[i];
    v2[i] = tmp;
  }
}

function createArray(size = 3) {
  const array = [];
  while (array.length < size) {
    array.push(0);
  }
  return array;
}

// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

const Pi = () => Math.PI;

function radiansFromDegrees(deg) {
  return (deg / 180) * Math.PI;
}

function degreesFromRadians(rad) {
  return (rad * 180) / Math.PI;
}

const { round, floor, ceil, min, max } = Math;

function arrayMin(arr, offset = 0, stride = 1) {
  let minValue = Infinity;
  for (let i = offset, len = arr.length; i < len; i += stride) {
    if (arr[i] < minValue) {
      minValue = arr[i];
    }
  }

  return minValue;
}

function arrayMax(arr, offset = 0, stride = 1) {
  let maxValue = -Infinity;
  for (let i = offset, len = arr.length; i < len; i += stride) {
    if (maxValue < arr[i]) {
      maxValue = arr[i];
    }
  }

  return maxValue;
}

function arrayRange(arr, offset = 0, stride = 1) {
  let minValue = Infinity;
  let maxValue = -Infinity;
  for (let i = offset, len = arr.length; i < len; i += stride) {
    if (arr[i] < minValue) {
      minValue = arr[i];
    }
    if (maxValue < arr[i]) {
      maxValue = arr[i];
    }
  }

  return [minValue, maxValue];
}

const ceilLog2 = notImplemented('ceilLog2');
const factorial = notImplemented('factorial');

function nearestPowerOfTwo(xi) {
  let v = 1;
  while (v < xi) {
    v *= 2;
  }
  return v;
}

function isPowerOfTwo(x) {
  return x === nearestPowerOfTwo(x);
}

function binomial(m, n) {
  let r = 1;
  for (let i = 1; i <= n; ++i) {
    r *= (m - i + 1) / i;
  }
  return Math.floor(r);
}

function beginCombination(m, n) {
  if (m < n) {
    return 0;
  }

  const r = createArray(n);
  for (let i = 0; i < n; ++i) {
    r[i] = i;
  }
  return r;
}

function nextCombination(m, n, r) {
  let status = 0;
  for (let i = n - 1; i >= 0; --i) {
    if (r[i] < m - n + i) {
      let j = r[i] + 1;
      while (i < n) {
        r[i++] = j++;
      }
      status = 1;
      break;
    }
  }
  return status;
}

function randomSeed(seed) {
  seedrandom__WEBPACK_IMPORTED_MODULE_0___default()(`${seed}`, { global: true });
  randomSeedValue = seed;
}

function getSeed() {
  return randomSeedValue;
}

function random(minValue = 0, maxValue = 1) {
  const delta = maxValue - minValue;
  return minValue + delta * Math.random();
}

const gaussian = notImplemented('gaussian');

// Vect3 operations
function add(a, b, out) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}

function subtract(a, b, out) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}

function multiplyScalar(vec, scalar) {
  vec[0] *= scalar;
  vec[1] *= scalar;
  vec[2] *= scalar;
  return vec;
}

function multiplyScalar2D(vec, scalar) {
  vec[0] *= scalar;
  vec[1] *= scalar;
  return vec;
}

function multiplyAccumulate(a, b, scalar, out) {
  out[0] = a[0] + b[0] * scalar;
  out[1] = a[1] + b[1] * scalar;
  out[2] = a[2] + b[2] * scalar;
  return out;
}

function multiplyAccumulate2D(a, b, scalar, out) {
  out[0] = a[0] + b[0] * scalar;
  out[1] = a[1] + b[1] * scalar;
  return out;
}

function dot(x, y) {
  return x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
}

function outer(x, y, out_3x3) {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      out_3x3[i][j] = x[i] * y[j];
    }
  }
}

function cross(x, y, out) {
  const Zx = x[1] * y[2] - x[2] * y[1];
  const Zy = x[2] * y[0] - x[0] * y[2];
  const Zz = x[0] * y[1] - x[1] * y[0];
  out[0] = Zx;
  out[1] = Zy;
  out[2] = Zz;
  return out;
}

function norm(x, n = 3) {
  switch (n) {
    case 1:
      return Math.abs(x);
    case 2:
      return Math.sqrt(x[0] * x[0] + x[1] * x[1]);
    case 3:
      return Math.sqrt(x[0] * x[0] + x[1] * x[1] + x[2] * x[2]);
    default: {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += x[i] * x[i];
      }
      return Math.sqrt(sum);
    }
  }
}

function normalize(x) {
  const den = norm(x);
  if (den !== 0.0) {
    x[0] /= den;
    x[1] /= den;
    x[2] /= den;
  }
  return den;
}

function perpendiculars(x, y, z, theta) {
  const x2 = x[0] * x[0];
  const y2 = x[1] * x[1];
  const z2 = x[2] * x[2];
  const r = Math.sqrt(x2 + y2 + z2);

  let dx;
  let dy;
  let dz;

  // transpose the vector to avoid divide-by-zero error
  if (x2 > y2 && x2 > z2) {
    dx = 0;
    dy = 1;
    dz = 2;
  } else if (y2 > z2) {
    dx = 1;
    dy = 2;
    dz = 0;
  } else {
    dx = 2;
    dy = 0;
    dz = 1;
  }

  const a = x[dx] / r;
  const b = x[dy] / r;
  const c = x[dz] / r;
  const tmp = Math.sqrt(a * a + c * c);

  if (theta !== 0) {
    const sintheta = Math.sin(theta);
    const costheta = Math.cos(theta);

    if (y) {
      y[dx] = (c * costheta - a * b * sintheta) / tmp;
      y[dy] = sintheta * tmp;
      y[dz] = (-(a * costheta) - b * c * sintheta) / tmp;
    }

    if (z) {
      z[dx] = (-(c * sintheta) - a * b * costheta) / tmp;
      z[dy] = costheta * tmp;
      z[dz] = (a * sintheta - b * c * costheta) / tmp;
    }
  } else {
    if (y) {
      y[dx] = c / tmp;
      y[dy] = 0;
      y[dz] = -a / tmp;
    }

    if (z) {
      z[dx] = (-a * b) / tmp;
      z[dy] = tmp;
      z[dz] = (-b * c) / tmp;
    }
  }
}

function projectVector(a, b, projection) {
  const bSquared = dot(b, b);

  if (bSquared === 0) {
    projection[0] = 0;
    projection[1] = 0;
    projection[2] = 0;
    return false;
  }

  const scale = dot(a, b) / bSquared;

  for (let i = 0; i < 3; i++) {
    projection[i] = b[i];
  }
  multiplyScalar(projection, scale);

  return true;
}

function dot2D(x, y) {
  return x[0] * y[0] + x[1] * y[1];
}

function projectVector2D(a, b, projection) {
  const bSquared = dot2D(b, b);

  if (bSquared === 0) {
    projection[0] = 0;
    projection[1] = 0;
    return false;
  }

  const scale = dot2D(a, b) / bSquared;

  for (let i = 0; i < 2; i++) {
    projection[i] = b[i];
  }
  multiplyScalar2D(projection, scale);

  return true;
}

function distance2BetweenPoints(x, y) {
  return (
    (x[0] - y[0]) * (x[0] - y[0]) +
    (x[1] - y[1]) * (x[1] - y[1]) +
    (x[2] - y[2]) * (x[2] - y[2])
  );
}

function angleBetweenVectors(v1, v2) {
  const crossVect = [0, 0, 0];
  cross(v1, v2, crossVect);
  return Math.atan2(norm(crossVect), dot(v1, v2));
}

function gaussianAmplitude(mean, variance, position) {
  const distanceFromMean = Math.abs(mean - position);
  return (
    (1 / Math.sqrt(2 * Math.PI * variance)) *
    Math.exp(-(distanceFromMean ** 2) / (2 * variance))
  );
}

function gaussianWeight(mean, variance, position) {
  const distanceFromMean = Math.abs(mean - position);
  return Math.exp(-(distanceFromMean ** 2) / (2 * variance));
}

function outer2D(x, y, out_2x2) {
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      out_2x2[i][j] = x[i] * y[j];
    }
  }
}

function norm2D(x2D) {
  return Math.sqrt(x2D[0] * x2D[0] + x2D[1] * x2D[1]);
}

function normalize2D(x) {
  const den = norm2D(x);
  if (den !== 0.0) {
    x[0] /= den;
    x[1] /= den;
  }
  return den;
}

function determinant2x2(...args) {
  if (args.length === 2) {
    return args[0][0] * args[1][1] - args[1][0] * args[0][1];
  }
  if (args.length === 4) {
    return args[0] * args[3] - args[1] * args[2];
  }
  return Number.NaN;
}

function LUFactor3x3(mat_3x3, index_3) {
  let maxI;
  let tmp;
  let largest;
  const scale = [0, 0, 0];

  // Loop over rows to get implicit scaling information
  for (let i = 0; i < 3; i++) {
    largest = Math.abs(mat_3x3[i][0]);
    if ((tmp = Math.abs(mat_3x3[i][1])) > largest) {
      largest = tmp;
    }
    if ((tmp = Math.abs(mat_3x3[i][2])) > largest) {
      largest = tmp;
    }
    scale[i] = 1 / largest;
  }

  // Loop over all columns using Crout's method

  // first column
  largest = scale[0] * Math.abs(mat_3x3[0][0]);
  maxI = 0;
  if ((tmp = scale[1] * Math.abs(mat_3x3[1][0])) >= largest) {
    largest = tmp;
    maxI = 1;
  }
  if ((tmp = scale[2] * Math.abs(mat_3x3[2][0])) >= largest) {
    maxI = 2;
  }
  if (maxI !== 0) {
    vtkSwapVectors3(mat_3x3[maxI], mat_3x3[0]);
    scale[maxI] = scale[0];
  }
  index_3[0] = maxI;

  mat_3x3[1][0] /= mat_3x3[0][0];
  mat_3x3[2][0] /= mat_3x3[0][0];

  // second column
  mat_3x3[1][1] -= mat_3x3[1][0] * mat_3x3[0][1];
  mat_3x3[2][1] -= mat_3x3[2][0] * mat_3x3[0][1];
  largest = scale[1] * Math.abs(mat_3x3[1][1]);
  maxI = 1;
  if ((tmp = scale[2] * Math.abs(mat_3x3[2][1])) >= largest) {
    maxI = 2;
    vtkSwapVectors3(mat_3x3[2], mat_3x3[1]);
    scale[2] = scale[1];
  }
  index_3[1] = maxI;
  mat_3x3[2][1] /= mat_3x3[1][1];

  // third column
  mat_3x3[1][2] -= mat_3x3[1][0] * mat_3x3[0][2];
  mat_3x3[2][2] -=
    mat_3x3[2][0] * mat_3x3[0][2] + mat_3x3[2][1] * mat_3x3[1][2];
  index_3[2] = 2;
}

function LUSolve3x3(mat_3x3, index_3, x_3) {
  // forward substitution
  let sum = x_3[index_3[0]];
  x_3[index_3[0]] = x_3[0];
  x_3[0] = sum;

  sum = x_3[index_3[1]];
  x_3[index_3[1]] = x_3[1];
  x_3[1] = sum - mat_3x3[1][0] * x_3[0];

  sum = x_3[index_3[2]];
  x_3[index_3[2]] = x_3[2];
  x_3[2] = sum - mat_3x3[2][0] * x_3[0] - mat_3x3[2][1] * x_3[1];

  // back substitution
  x_3[2] /= mat_3x3[2][2];
  x_3[1] = (x_3[1] - mat_3x3[1][2] * x_3[2]) / mat_3x3[1][1];
  x_3[0] =
    (x_3[0] - mat_3x3[0][1] * x_3[1] - mat_3x3[0][2] * x_3[2]) / mat_3x3[0][0];
}

function linearSolve3x3(mat_3x3, x_3, y_3) {
  const a1 = mat_3x3[0][0];
  const b1 = mat_3x3[0][1];
  const c1 = mat_3x3[0][2];
  const a2 = mat_3x3[1][0];
  const b2 = mat_3x3[1][1];
  const c2 = mat_3x3[1][2];
  const a3 = mat_3x3[2][0];
  const b3 = mat_3x3[2][1];
  const c3 = mat_3x3[2][2];

  // Compute the adjoint
  const d1 = +determinant2x2(b2, b3, c2, c3);
  const d2 = -determinant2x2(a2, a3, c2, c3);
  const d3 = +determinant2x2(a2, a3, b2, b3);

  const e1 = -determinant2x2(b1, b3, c1, c3);
  const e2 = +determinant2x2(a1, a3, c1, c3);
  const e3 = -determinant2x2(a1, a3, b1, b3);

  const f1 = +determinant2x2(b1, b2, c1, c2);
  const f2 = -determinant2x2(a1, a2, c1, c2);
  const f3 = +determinant2x2(a1, a2, b1, b2);

  // Compute the determinant
  const det = a1 * d1 + b1 * d2 + c1 * d3;

  // Multiply by the adjoint
  const v1 = d1 * x_3[0] + e1 * x_3[1] + f1 * x_3[2];
  const v2 = d2 * x_3[0] + e2 * x_3[1] + f2 * x_3[2];
  const v3 = d3 * x_3[0] + e3 * x_3[1] + f3 * x_3[2];

  // Divide by the determinant
  y_3[0] = v1 / det;
  y_3[1] = v2 / det;
  y_3[2] = v3 / det;
}

function multiply3x3_vect3(mat_3x3, in_3, out_3) {
  const x =
    mat_3x3[0][0] * in_3[0] + mat_3x3[0][1] * in_3[1] + mat_3x3[0][2] * in_3[2];
  const y =
    mat_3x3[1][0] * in_3[0] + mat_3x3[1][1] * in_3[1] + mat_3x3[1][2] * in_3[2];
  const z =
    mat_3x3[2][0] * in_3[0] + mat_3x3[2][1] * in_3[1] + mat_3x3[2][2] * in_3[2];

  out_3[0] = x;
  out_3[1] = y;
  out_3[2] = z;
}

function multiply3x3_mat3(a_3x3, b_3x3, out_3x3) {
  const tmp = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  for (let i = 0; i < 3; i++) {
    tmp[0][i] =
      a_3x3[0][0] * b_3x3[0][i] +
      a_3x3[0][1] * b_3x3[1][i] +
      a_3x3[0][2] * b_3x3[2][i];
    tmp[1][i] =
      a_3x3[1][0] * b_3x3[0][i] +
      a_3x3[1][1] * b_3x3[1][i] +
      a_3x3[1][2] * b_3x3[2][i];
    tmp[2][i] =
      a_3x3[2][0] * b_3x3[0][i] +
      a_3x3[2][1] * b_3x3[1][i] +
      a_3x3[2][2] * b_3x3[2][i];
  }

  for (let j = 0; j < 3; j++) {
    out_3x3[j][0] = tmp[j][0];
    out_3x3[j][1] = tmp[j][1];
    out_3x3[j][2] = tmp[j][2];
  }
}

function multiplyMatrix(a, b, rowA, colA, rowB, colB, out_rowXcol) {
  // we need colA == rowB
  if (colA !== rowB) {
    vtkErrorMacro('Number of columns of A must match number of rows of B.');
  }

  // output matrix is rowA*colB
  // output row
  for (let i = 0; i < rowA; i++) {
    // output col
    for (let j = 0; j < colB; j++) {
      out_rowXcol[i][j] = 0;
      // sum for this point
      for (let k = 0; k < colA; k++) {
        out_rowXcol[i][j] += a[i][k] * b[k][j];
      }
    }
  }
}

function transpose3x3(in_3x3, outT_3x3) {
  let tmp;
  tmp = in_3x3[1][0];
  outT_3x3[1][0] = in_3x3[0][1];
  outT_3x3[0][1] = tmp;
  tmp = in_3x3[2][0];
  outT_3x3[2][0] = in_3x3[0][2];
  outT_3x3[0][2] = tmp;
  tmp = in_3x3[2][1];
  outT_3x3[2][1] = in_3x3[1][2];
  outT_3x3[1][2] = tmp;

  outT_3x3[0][0] = in_3x3[0][0];
  outT_3x3[1][1] = in_3x3[1][1];
  outT_3x3[2][2] = in_3x3[2][2];
}

function invert3x3(in_3x3, outI_3x3) {
  const a1 = in_3x3[0][0];
  const b1 = in_3x3[0][1];
  const c1 = in_3x3[0][2];
  const a2 = in_3x3[1][0];
  const b2 = in_3x3[1][1];
  const c2 = in_3x3[1][2];
  const a3 = in_3x3[2][0];
  const b3 = in_3x3[2][1];
  const c3 = in_3x3[2][2];

  // Compute the adjoint
  const d1 = +determinant2x2(b2, b3, c2, c3);
  const d2 = -determinant2x2(a2, a3, c2, c3);
  const d3 = +determinant2x2(a2, a3, b2, b3);

  const e1 = -determinant2x2(b1, b3, c1, c3);
  const e2 = +determinant2x2(a1, a3, c1, c3);
  const e3 = -determinant2x2(a1, a3, b1, b3);

  const f1 = +determinant2x2(b1, b2, c1, c2);
  const f2 = -determinant2x2(a1, a2, c1, c2);
  const f3 = +determinant2x2(a1, a2, b1, b2);

  // Divide by the determinant
  const det = a1 * d1 + b1 * d2 + c1 * d3;

  outI_3x3[0][0] = d1 / det;
  outI_3x3[1][0] = d2 / det;
  outI_3x3[2][0] = d3 / det;

  outI_3x3[0][1] = e1 / det;
  outI_3x3[1][1] = e2 / det;
  outI_3x3[2][1] = e3 / det;

  outI_3x3[0][2] = f1 / det;
  outI_3x3[1][2] = f2 / det;
  outI_3x3[2][2] = f3 / det;
}

function identity3x3(mat_3x3) {
  for (let i = 0; i < 3; i++) {
    mat_3x3[i][0] = mat_3x3[i][1] = mat_3x3[i][2] = 0;
    mat_3x3[i][i] = 1;
  }
}

function determinant3x3(mat_3x3) {
  return (
    mat_3x3[0][0] * mat_3x3[1][1] * mat_3x3[2][2] +
    mat_3x3[1][0] * mat_3x3[2][1] * mat_3x3[0][2] +
    mat_3x3[2][0] * mat_3x3[0][1] * mat_3x3[1][2] -
    mat_3x3[0][0] * mat_3x3[2][1] * mat_3x3[1][2] -
    mat_3x3[1][0] * mat_3x3[0][1] * mat_3x3[2][2] -
    mat_3x3[2][0] * mat_3x3[1][1] * mat_3x3[0][2]
  );
}

function quaternionToMatrix3x3(quat_4, mat_3x3) {
  const ww = quat_4[0] * quat_4[0];
  const wx = quat_4[0] * quat_4[1];
  const wy = quat_4[0] * quat_4[2];
  const wz = quat_4[0] * quat_4[3];

  const xx = quat_4[1] * quat_4[1];
  const yy = quat_4[2] * quat_4[2];
  const zz = quat_4[3] * quat_4[3];

  const xy = quat_4[1] * quat_4[2];
  const xz = quat_4[1] * quat_4[3];
  const yz = quat_4[2] * quat_4[3];

  const rr = xx + yy + zz;
  // normalization factor, just in case quaternion was not normalized
  let f = 1 / (ww + rr);
  const s = (ww - rr) * f;
  f *= 2;

  mat_3x3[0][0] = xx * f + s;
  mat_3x3[1][0] = (xy + wz) * f;
  mat_3x3[2][0] = (xz - wy) * f;

  mat_3x3[0][1] = (xy - wz) * f;
  mat_3x3[1][1] = yy * f + s;
  mat_3x3[2][1] = (yz + wx) * f;

  mat_3x3[0][2] = (xz + wy) * f;
  mat_3x3[1][2] = (yz - wx) * f;
  mat_3x3[2][2] = zz * f + s;
}

/**
 * Returns true if elements of both arrays are equals.
 * @param {Array} a an array of numbers (vector, point, matrix...)
 * @param {Array} b an array of numbers (vector, point, matrix...)
 * @param {Number} eps tolerance
 */
function areEquals(a, b, eps = 1e-6) {
  if (!a.length === b.length) {
    return false;
  }

  function isEqual(element, index) {
    return Math.abs(element - b[index]) < eps;
  }
  return a.every(isEqual);
}

const areMatricesEqual = areEquals;

function jacobiN(a, n, w, v) {
  let i;
  let j;
  let k;
  let iq;
  let ip;
  let numPos;
  let tresh;
  let theta;
  let t;
  let tau;
  let sm;
  let s;
  let h;
  let g;
  let c;
  let tmp;
  const b = createArray(n);
  const z = createArray(n);

  const vtkROTATE = (aa, ii, jj, kk, ll) => {
    g = aa[ii][jj];
    h = aa[kk][ll];
    aa[ii][jj] = g - s * (h + g * tau);
    aa[kk][ll] = h + s * (g - h * tau);
  };

  // initialize
  for (ip = 0; ip < n; ip++) {
    for (iq = 0; iq < n; iq++) {
      v[ip][iq] = 0.0;
    }
    v[ip][ip] = 1.0;
  }
  for (ip = 0; ip < n; ip++) {
    b[ip] = w[ip] = a[ip][ip];
    z[ip] = 0.0;
  }

  // begin rotation sequence
  for (i = 0; i < VTK_MAX_ROTATIONS; i++) {
    sm = 0.0;
    for (ip = 0; ip < n - 1; ip++) {
      for (iq = ip + 1; iq < n; iq++) {
        sm += Math.abs(a[ip][iq]);
      }
    }
    if (sm === 0.0) {
      break;
    }

    // first 3 sweeps
    if (i < 3) {
      tresh = (0.2 * sm) / (n * n);
    } else {
      tresh = 0.0;
    }

    for (ip = 0; ip < n - 1; ip++) {
      for (iq = ip + 1; iq < n; iq++) {
        g = 100.0 * Math.abs(a[ip][iq]);

        // after 4 sweeps
        if (
          i > 3 &&
          Math.abs(w[ip]) + g === Math.abs(w[ip]) &&
          Math.abs(w[iq]) + g === Math.abs(w[iq])
        ) {
          a[ip][iq] = 0.0;
        } else if (Math.abs(a[ip][iq]) > tresh) {
          h = w[iq] - w[ip];
          if (Math.abs(h) + g === Math.abs(h)) {
            t = a[ip][iq] / h;
          } else {
            theta = (0.5 * h) / a[ip][iq];
            t = 1.0 / (Math.abs(theta) + Math.sqrt(1.0 + theta * theta));
            if (theta < 0.0) {
              t = -t;
            }
          }
          c = 1.0 / Math.sqrt(1 + t * t);
          s = t * c;
          tau = s / (1.0 + c);
          h = t * a[ip][iq];
          z[ip] -= h;
          z[iq] += h;
          w[ip] -= h;
          w[iq] += h;
          a[ip][iq] = 0.0;

          // ip already shifted left by 1 unit
          for (j = 0; j <= ip - 1; j++) {
            vtkROTATE(a, j, ip, j, iq);
          }
          // ip and iq already shifted left by 1 unit
          for (j = ip + 1; j <= iq - 1; j++) {
            vtkROTATE(a, ip, j, j, iq);
          }
          // iq already shifted left by 1 unit
          for (j = iq + 1; j < n; j++) {
            vtkROTATE(a, ip, j, iq, j);
          }
          for (j = 0; j < n; j++) {
            vtkROTATE(v, j, ip, j, iq);
          }
        }
      }
    }

    for (ip = 0; ip < n; ip++) {
      b[ip] += z[ip];
      w[ip] = b[ip];
      z[ip] = 0.0;
    }
  }

  // this is NEVER called
  if (i >= VTK_MAX_ROTATIONS) {
    vtkWarningMacro('vtkMath::Jacobi: Error extracting eigenfunctions');
    return 0;
  }

  // sort eigenfunctions: these changes do not affect accuracy
  for (j = 0; j < n - 1; j++) {
    // boundary incorrect
    k = j;
    tmp = w[k];
    for (i = j + 1; i < n; i++) {
      // boundary incorrect, shifted already
      if (w[i] >= tmp) {
        // why exchange if same?
        k = i;
        tmp = w[k];
      }
    }
    if (k !== j) {
      w[k] = w[j];
      w[j] = tmp;
      for (i = 0; i < n; i++) {
        tmp = v[i][j];
        v[i][j] = v[i][k];
        v[i][k] = tmp;
      }
    }
  }
  // ensure eigenvector consistency (i.e., Jacobi can compute vectors that
  // are negative of one another (.707,.707,0) and (-.707,-.707,0). This can
  // reek havoc in hyperstreamline/other stuff. We will select the most
  // positive eigenvector.
  const ceil_half_n = (n >> 1) + (n & 1);
  for (j = 0; j < n; j++) {
    for (numPos = 0, i = 0; i < n; i++) {
      if (v[i][j] >= 0.0) {
        numPos++;
      }
    }
    //    if ( numPos < ceil(double(n)/double(2.0)) )
    if (numPos < ceil_half_n) {
      for (i = 0; i < n; i++) {
        v[i][j] *= -1.0;
      }
    }
  }
  return 1;
}

function matrix3x3ToQuaternion(mat_3x3, quat_4) {
  const tmp = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  // on-diagonal elements
  tmp[0][0] = mat_3x3[0][0] + mat_3x3[1][1] + mat_3x3[2][2];
  tmp[1][1] = mat_3x3[0][0] - mat_3x3[1][1] - mat_3x3[2][2];
  tmp[2][2] = -mat_3x3[0][0] + mat_3x3[1][1] - mat_3x3[2][2];
  tmp[3][3] = -mat_3x3[0][0] - mat_3x3[1][1] + mat_3x3[2][2];

  // off-diagonal elements
  tmp[0][1] = tmp[1][0] = mat_3x3[2][1] - mat_3x3[1][2];
  tmp[0][2] = tmp[2][0] = mat_3x3[0][2] - mat_3x3[2][0];
  tmp[0][3] = tmp[3][0] = mat_3x3[1][0] - mat_3x3[0][1];

  tmp[1][2] = tmp[2][1] = mat_3x3[1][0] + mat_3x3[0][1];
  tmp[1][3] = tmp[3][1] = mat_3x3[0][2] + mat_3x3[2][0];
  tmp[2][3] = tmp[3][2] = mat_3x3[2][1] + mat_3x3[1][2];

  const eigenvectors = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const eigenvalues = [0, 0, 0, 0];

  // convert into format that JacobiN can use,
  // then use Jacobi to find eigenvalues and eigenvectors
  const NTemp = [0, 0, 0, 0];
  const eigenvectorsTemp = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    NTemp[i] = tmp[i];
    eigenvectorsTemp[i] = eigenvectors[i];
  }
  jacobiN(NTemp, 4, eigenvalues, eigenvectorsTemp);

  // the first eigenvector is the one we want
  quat_4[0] = eigenvectors[0][0];
  quat_4[1] = eigenvectors[1][0];
  quat_4[2] = eigenvectors[2][0];
  quat_4[3] = eigenvectors[3][0];
}

function multiplyQuaternion(quat_1, quat_2, quat_out) {
  const ww = quat_1[0] * quat_2[0];
  const wx = quat_1[0] * quat_2[1];
  const wy = quat_1[0] * quat_2[2];
  const wz = quat_1[0] * quat_2[3];

  const xw = quat_1[1] * quat_2[0];
  const xx = quat_1[1] * quat_2[1];
  const xy = quat_1[1] * quat_2[2];
  const xz = quat_1[1] * quat_2[3];

  const yw = quat_1[2] * quat_2[0];
  const yx = quat_1[2] * quat_2[1];
  const yy = quat_1[2] * quat_2[2];
  const yz = quat_1[2] * quat_2[3];

  const zw = quat_1[3] * quat_2[0];
  const zx = quat_1[3] * quat_2[1];
  const zy = quat_1[3] * quat_2[2];
  const zz = quat_1[3] * quat_2[3];

  quat_out[0] = ww - xx - yy - zz;
  quat_out[1] = wx + xw + yz - zy;
  quat_out[2] = wy - xz + yw + zx;
  quat_out[3] = wz + xy - yx + zw;
}

function orthogonalize3x3(a_3x3, out_3x3) {
  // copy the matrix
  for (let i = 0; i < 3; i++) {
    out_3x3[0][i] = a_3x3[0][i];
    out_3x3[1][i] = a_3x3[1][i];
    out_3x3[2][i] = a_3x3[2][i];
  }

  // Pivot the matrix to improve accuracy
  const scale = createArray(3);
  const index = createArray(3);
  let largest;

  // Loop over rows to get implicit scaling information
  for (let i = 0; i < 3; i++) {
    const x1 = Math.abs(out_3x3[i][0]);
    const x2 = Math.abs(out_3x3[i][1]);
    const x3 = Math.abs(out_3x3[i][2]);
    largest = x2 > x1 ? x2 : x1;
    largest = x3 > largest ? x3 : largest;
    scale[i] = 1;
    if (largest !== 0) {
      scale[i] /= largest;
    }
  }

  // first column
  const x1 = Math.abs(out_3x3[0][0]) * scale[0];
  const x2 = Math.abs(out_3x3[1][0]) * scale[1];
  const x3 = Math.abs(out_3x3[2][0]) * scale[2];
  index[0] = 0;
  largest = x1;
  if (x2 >= largest) {
    largest = x2;
    index[0] = 1;
  }
  if (x3 >= largest) {
    index[0] = 2;
  }
  if (index[0] !== 0) {
    vtkSwapVectors3(out_3x3[index[0]], out_3x3[0]);
    scale[index[0]] = scale[0];
  }

  // second column
  const y2 = Math.abs(out_3x3[1][1]) * scale[1];
  const y3 = Math.abs(out_3x3[2][1]) * scale[2];
  index[1] = 1;
  largest = y2;
  if (y3 >= largest) {
    index[1] = 2;
    vtkSwapVectors3(out_3x3[2], out_3x3[1]);
  }

  // third column
  index[2] = 2;

  // A quaternion can only describe a pure rotation, not
  // a rotation with a flip, therefore the flip must be
  // removed before the matrix is converted to a quaternion.
  let flip = 0;
  if (determinant3x3(out_3x3) < 0) {
    flip = 1;
    for (let i = 0; i < 3; i++) {
      out_3x3[0][i] = -out_3x3[0][i];
      out_3x3[1][i] = -out_3x3[1][i];
      out_3x3[2][i] = -out_3x3[2][i];
    }
  }

  // Do orthogonalization using a quaternion intermediate
  // (this, essentially, does the orthogonalization via
  // diagonalization of an appropriately constructed symmetric
  // 4x4 matrix rather than by doing SVD of the 3x3 matrix)
  const quat = createArray(4);
  matrix3x3ToQuaternion(out_3x3, quat);
  quaternionToMatrix3x3(quat, out_3x3);

  // Put the flip back into the orthogonalized matrix.
  if (flip) {
    for (let i = 0; i < 3; i++) {
      out_3x3[0][i] = -out_3x3[0][i];
      out_3x3[1][i] = -out_3x3[1][i];
      out_3x3[2][i] = -out_3x3[2][i];
    }
  }

  // Undo the pivoting
  if (index[1] !== 1) {
    vtkSwapVectors3(out_3x3[index[1]], out_3x3[1]);
  }
  if (index[0] !== 0) {
    vtkSwapVectors3(out_3x3[index[0]], out_3x3[0]);
  }
}

function diagonalize3x3(a_3x3, w_3, v_3x3) {
  let i;
  let j;
  let k;
  let maxI;
  let tmp;
  let maxVal;

  // do the matrix[3][3] to **matrix conversion for Jacobi
  const C = [createArray(3), createArray(3), createArray(3)];
  const ATemp = createArray(3);
  const VTemp = createArray(3);
  for (i = 0; i < 3; i++) {
    C[i][0] = a_3x3[i][0];
    C[i][1] = a_3x3[i][1];
    C[i][2] = a_3x3[i][2];
    ATemp[i] = C[i];
    VTemp[i] = v_3x3[i];
  }

  // diagonalize using Jacobi
  jacobiN(ATemp, 3, w_3, VTemp);

  // if all the eigenvalues are the same, return identity matrix
  if (w_3[0] === w_3[1] && w_3[0] === w_3[2]) {
    identity3x3(v_3x3);
    return;
  }

  // transpose temporarily, it makes it easier to sort the eigenvectors
  transpose3x3(v_3x3, v_3x3);

  // if two eigenvalues are the same, re-orthogonalize to optimally line
  // up the eigenvectors with the x, y, and z axes
  for (i = 0; i < 3; i++) {
    // two eigenvalues are the same
    if (w_3[(i + 1) % 3] === w_3[(i + 2) % 3]) {
      // find maximum element of the independent eigenvector
      maxVal = Math.abs(v_3x3[i][0]);
      maxI = 0;
      for (j = 1; j < 3; j++) {
        if (maxVal < (tmp = Math.abs(v_3x3[i][j]))) {
          maxVal = tmp;
          maxI = j;
        }
      }
      // swap the eigenvector into its proper position
      if (maxI !== i) {
        tmp = w_3[maxI];
        w_3[maxI] = w_3[i];
        w_3[i] = tmp;
        vtkSwapVectors3(v_3x3[i], v_3x3[maxI]);
      }
      // maximum element of eigenvector should be positive
      if (v_3x3[maxI][maxI] < 0) {
        v_3x3[maxI][0] = -v_3x3[maxI][0];
        v_3x3[maxI][1] = -v_3x3[maxI][1];
        v_3x3[maxI][2] = -v_3x3[maxI][2];
      }

      // re-orthogonalize the other two eigenvectors
      j = (maxI + 1) % 3;
      k = (maxI + 2) % 3;

      v_3x3[j][0] = 0.0;
      v_3x3[j][1] = 0.0;
      v_3x3[j][2] = 0.0;
      v_3x3[j][j] = 1.0;
      cross(v_3x3[maxI], v_3x3[j], v_3x3[k]);
      normalize(v_3x3[k]);
      cross(v_3x3[k], v_3x3[maxI], v_3x3[j]);

      // transpose vectors back to columns
      transpose3x3(v_3x3, v_3x3);
      return;
    }
  }

  // the three eigenvalues are different, just sort the eigenvectors
  // to align them with the x, y, and z axes

  // find the vector with the largest x element, make that vector
  // the first vector
  maxVal = Math.abs(v_3x3[0][0]);
  maxI = 0;
  for (i = 1; i < 3; i++) {
    if (maxVal < (tmp = Math.abs(v_3x3[i][0]))) {
      maxVal = tmp;
      maxI = i;
    }
  }
  // swap eigenvalue and eigenvector
  if (maxI !== 0) {
    tmp = w_3[maxI];
    w_3[maxI] = w_3[0];
    w_3[0] = tmp;
    vtkSwapVectors3(v_3x3[maxI], v_3x3[0]);
  }
  // do the same for the y element
  if (Math.abs(v_3x3[1][1]) < Math.abs(v_3x3[2][1])) {
    tmp = w_3[2];
    w_3[2] = w_3[1];
    w_3[1] = tmp;
    vtkSwapVectors3(v_3x3[2], v_3x3[1]);
  }

  // ensure that the sign of the eigenvectors is correct
  for (i = 0; i < 2; i++) {
    if (v_3x3[i][i] < 0) {
      v_3x3[i][0] = -v_3x3[i][0];
      v_3x3[i][1] = -v_3x3[i][1];
      v_3x3[i][2] = -v_3x3[i][2];
    }
  }
  // set sign of final eigenvector to ensure that determinant is positive
  if (determinant3x3(v_3x3) < 0) {
    v_3x3[2][0] = -v_3x3[2][0];
    v_3x3[2][1] = -v_3x3[2][1];
    v_3x3[2][2] = -v_3x3[2][2];
  }

  // transpose the eigenvectors back again
  transpose3x3(v_3x3, v_3x3);
}

function singularValueDecomposition3x3(a_3x3, u_3x3, w_3, vT_3x3) {
  let i;
  const B = [createArray(3), createArray(3), createArray(3)];

  // copy so that A can be used for U or VT without risk
  for (i = 0; i < 3; i++) {
    B[0][i] = a_3x3[0][i];
    B[1][i] = a_3x3[1][i];
    B[2][i] = a_3x3[2][i];
  }

  // temporarily flip if determinant is negative
  const d = determinant3x3(B);
  if (d < 0) {
    for (i = 0; i < 3; i++) {
      B[0][i] = -B[0][i];
      B[1][i] = -B[1][i];
      B[2][i] = -B[2][i];
    }
  }

  // orthogonalize, diagonalize, etc.
  orthogonalize3x3(B, u_3x3);
  transpose3x3(B, B);
  multiply3x3_mat3(B, u_3x3, vT_3x3);
  diagonalize3x3(vT_3x3, w_3, vT_3x3);
  multiply3x3_mat3(u_3x3, vT_3x3, u_3x3);
  transpose3x3(vT_3x3, vT_3x3);

  // re-create the flip
  if (d < 0) {
    w_3[0] = -w_3[0];
    w_3[1] = -w_3[1];
    w_3[2] = -w_3[2];
  }
}

function luFactorLinearSystem(A, index, size) {
  let i;
  let j;
  let k;
  let largest;
  let maxI = 0;
  let sum;
  let temp1;
  let temp2;
  const scale = createArray(size);

  //
  // Loop over rows to get implicit scaling information
  //
  for (i = 0; i < size; i++) {
    for (largest = 0.0, j = 0; j < size; j++) {
      if ((temp2 = Math.abs(A[i][j])) > largest) {
        largest = temp2;
      }
    }

    if (largest === 0.0) {
      vtkWarningMacro('Unable to factor linear system');
      return 0;
    }
    scale[i] = 1.0 / largest;
  }
  //
  // Loop over all columns using Crout's method
  //
  for (j = 0; j < size; j++) {
    for (i = 0; i < j; i++) {
      sum = A[i][j];
      for (k = 0; k < i; k++) {
        sum -= A[i][k] * A[k][j];
      }
      A[i][j] = sum;
    }
    //
    // Begin search for largest pivot element
    //
    for (largest = 0.0, i = j; i < size; i++) {
      sum = A[i][j];
      for (k = 0; k < j; k++) {
        sum -= A[i][k] * A[k][j];
      }
      A[i][j] = sum;

      if ((temp1 = scale[i] * Math.abs(sum)) >= largest) {
        largest = temp1;
        maxI = i;
      }
    }
    //
    // Check for row interchange
    //
    if (j !== maxI) {
      for (k = 0; k < size; k++) {
        temp1 = A[maxI][k];
        A[maxI][k] = A[j][k];
        A[j][k] = temp1;
      }
      scale[maxI] = scale[j];
    }
    //
    // Divide by pivot element and perform elimination
    //
    index[j] = maxI;

    if (Math.abs(A[j][j]) <= VTK_SMALL_NUMBER) {
      vtkWarningMacro('Unable to factor linear system');
      return 0;
    }

    if (j !== size - 1) {
      temp1 = 1.0 / A[j][j];
      for (i = j + 1; i < size; i++) {
        A[i][j] *= temp1;
      }
    }
  }
  return 1;
}

function luSolveLinearSystem(A, index, x, size) {
  let i;
  let j;
  let ii;
  let idx;
  let sum;
  //
  // Proceed with forward and backsubstitution for L and U
  // matrices.  First, forward substitution.
  //
  for (ii = -1, i = 0; i < size; i++) {
    idx = index[i];
    sum = x[idx];
    x[idx] = x[i];

    if (ii >= 0) {
      for (j = ii; j <= i - 1; j++) {
        sum -= A[i][j] * x[j];
      }
    } else if (sum !== 0.0) {
      ii = i;
    }

    x[i] = sum;
  }
  //
  // Now, back substitution
  //
  for (i = size - 1; i >= 0; i--) {
    sum = x[i];
    for (j = i + 1; j < size; j++) {
      sum -= A[i][j] * x[j];
    }
    x[i] = sum / A[i][i];
  }
}

function solveLinearSystem(A, x, size) {
  // if we solving something simple, just solve it
  if (size === 2) {
    const y = createArray(2);
    const det = determinant2x2(A[0][0], A[0][1], A[1][0], A[1][1]);

    if (det === 0.0) {
      // Unable to solve linear system
      return 0;
    }

    y[0] = (A[1][1] * x[0] - A[0][1] * x[1]) / det;
    y[1] = (-(A[1][0] * x[0]) + A[0][0] * x[1]) / det;

    x[0] = y[0];
    x[1] = y[1];
    return 1;
  }

  if (size === 1) {
    if (A[0][0] === 0.0) {
      // Unable to solve linear system
      return 0;
    }

    x[0] /= A[0][0];
    return 1;
  }

  //
  // System of equations is not trivial, use Crout's method
  //

  // Check on allocation of working vectors
  const index = createArray(size);

  // Factor and solve matrix
  if (luFactorLinearSystem(A, index, size) === 0) {
    return 0;
  }
  luSolveLinearSystem(A, index, x, size);

  return 1;
}

function invertMatrix(A, AI, size, index = null, column = null) {
  const tmp1Size = index || createArray(size);
  const tmp2Size = column || createArray(size);

  // Factor matrix; then begin solving for inverse one column at a time.
  // Note: tmp1Size returned value is used later, tmp2Size is just working
  // memory whose values are not used in LUSolveLinearSystem
  if (luFactorLinearSystem(A, tmp1Size, size, tmp2Size) === 0) {
    return 0;
  }

  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      tmp2Size[i] = 0.0;
    }
    tmp2Size[j] = 1.0;

    luSolveLinearSystem(A, tmp1Size, tmp2Size, size);

    for (let i = 0; i < size; i++) {
      AI[i][j] = tmp2Size[i];
    }
  }

  return 1;
}

function estimateMatrixCondition(A, size) {
  let minValue = +Number.MAX_VALUE;
  let maxValue = -Number.MAX_VALUE;

  // find the maximum value
  for (let i = 0; i < size; i++) {
    for (let j = i; j < size; j++) {
      if (Math.abs(A[i][j]) > max) {
        maxValue = Math.abs(A[i][j]);
      }
    }
  }

  // find the minimum diagonal value
  for (let i = 0; i < size; i++) {
    if (Math.abs(A[i][i]) < min) {
      minValue = Math.abs(A[i][i]);
    }
  }

  if (minValue === 0.0) {
    return Number.MAX_VALUE;
  }
  return maxValue / minValue;
}

function jacobi(a_3x3, w, v) {
  return jacobiN(a_3x3, 3, w, v);
}

function solveHomogeneousLeastSquares(numberOfSamples, xt, xOrder, mt) {
  // check dimensional consistency
  if (numberOfSamples < xOrder) {
    vtkWarningMacro('Insufficient number of samples. Underdetermined.');
    return 0;
  }

  let i;
  let j;
  let k;

  // set up intermediate variables
  // Allocate matrix to hold X times transpose of X
  const XXt = createArray(xOrder); // size x by x
  // Allocate the array of eigenvalues and eigenvectors
  const eigenvals = createArray(xOrder);
  const eigenvecs = createArray(xOrder);

  // Clear the upper triangular region (and btw, allocate the eigenvecs as well)
  for (i = 0; i < xOrder; i++) {
    eigenvecs[i] = createArray(xOrder);
    XXt[i] = createArray(xOrder);
    for (j = 0; j < xOrder; j++) {
      XXt[i][j] = 0.0;
    }
  }

  // Calculate XXt upper half only, due to symmetry
  for (k = 0; k < numberOfSamples; k++) {
    for (i = 0; i < xOrder; i++) {
      for (j = i; j < xOrder; j++) {
        XXt[i][j] += xt[k][i] * xt[k][j];
      }
    }
  }

  // now fill in the lower half of the XXt matrix
  for (i = 0; i < xOrder; i++) {
    for (j = 0; j < i; j++) {
      XXt[i][j] = XXt[j][i];
    }
  }

  // Compute the eigenvectors and eigenvalues
  jacobiN(XXt, xOrder, eigenvals, eigenvecs);

  // Smallest eigenval is at the end of the list (xOrder-1), and solution is
  // corresponding eigenvec.
  for (i = 0; i < xOrder; i++) {
    mt[i][0] = eigenvecs[i][xOrder - 1];
  }

  return 1;
}

function solveLeastSquares(
  numberOfSamples,
  xt,
  xOrder,
  yt,
  yOrder,
  mt,
  checkHomogeneous = true
) {
  // check dimensional consistency
  if (numberOfSamples < xOrder || numberOfSamples < yOrder) {
    vtkWarningMacro('Insufficient number of samples. Underdetermined.');
    return 0;
  }

  const homogenFlags = createArray(yOrder);
  let allHomogeneous = 1;
  let hmt;
  let homogRC = 0;
  let i;
  let j;
  let k;
  let someHomogeneous = 0;

  // Ok, first init some flags check and see if all the systems are homogeneous
  if (checkHomogeneous) {
    // If Y' is zero, it's a homogeneous system and can't be solved via
    // the pseudoinverse method. Detect this case, warn the user, and
    // invoke SolveHomogeneousLeastSquares instead. Note that it doesn't
    // really make much sense for yOrder to be greater than one in this case,
    // since that's just yOrder occurrences of a 0 vector on the RHS, but
    // we allow it anyway. N

    // Initialize homogeneous flags on a per-right-hand-side basis
    for (j = 0; j < yOrder; j++) {
      homogenFlags[j] = 1;
    }
    for (i = 0; i < numberOfSamples; i++) {
      for (j = 0; j < yOrder; j++) {
        if (Math.abs(yt[i][j]) > VTK_SMALL_NUMBER) {
          allHomogeneous = 0;
          homogenFlags[j] = 0;
        }
      }
    }

    // If we've got one system, and it's homogeneous, do it and bail out quickly.
    if (allHomogeneous && yOrder === 1) {
      vtkWarningMacro(
        'Detected homogeneous system (Y=0), calling SolveHomogeneousLeastSquares()'
      );
      return solveHomogeneousLeastSquares(numberOfSamples, xt, xOrder, mt);
    }

    // Ok, we've got more than one system of equations.
    // Figure out if we need to calculate the homogeneous equation solution for
    // any of them.
    if (allHomogeneous) {
      someHomogeneous = 1;
    } else {
      for (j = 0; j < yOrder; j++) {
        if (homogenFlags[j]) {
          someHomogeneous = 1;
        }
      }
    }
  }

  // If necessary, solve the homogeneous problem
  if (someHomogeneous) {
    // hmt is the homogeneous equation version of mt, the general solution.
    hmt = createArray(xOrder);
    for (j = 0; j < xOrder; j++) {
      // Only allocate 1 here, not yOrder, because here we're going to solve
      // just the one homogeneous equation subset of the entire problem
      hmt[j] = [0];
    }

    // Ok, solve the homogeneous problem
    homogRC = solveHomogeneousLeastSquares(numberOfSamples, xt, xOrder, hmt);
  }

  // set up intermediate variables
  const XXt = createArray(xOrder); // size x by x
  const XXtI = createArray(xOrder); // size x by x
  const XYt = createArray(xOrder); // size x by y
  for (i = 0; i < xOrder; i++) {
    XXt[i] = createArray(xOrder);
    XXtI[i] = createArray(xOrder);

    for (j = 0; j < xOrder; j++) {
      XXt[i][j] = 0.0;
      XXtI[i][j] = 0.0;
    }

    XYt[i] = createArray(yOrder);
    for (j = 0; j < yOrder; j++) {
      XYt[i][j] = 0.0;
    }
  }

  // first find the pseudoinverse matrix
  for (k = 0; k < numberOfSamples; k++) {
    for (i = 0; i < xOrder; i++) {
      // first calculate the XXt matrix, only do the upper half (symmetrical)
      for (j = i; j < xOrder; j++) {
        XXt[i][j] += xt[k][i] * xt[k][j];
      }

      // now calculate the XYt matrix
      for (j = 0; j < yOrder; j++) {
        XYt[i][j] += xt[k][i] * yt[k][j];
      }
    }
  }

  // now fill in the lower half of the XXt matrix
  for (i = 0; i < xOrder; i++) {
    for (j = 0; j < i; j++) {
      XXt[i][j] = XXt[j][i];
    }
  }

  const successFlag = invertMatrix(XXt, XXtI, xOrder);

  // next get the inverse of XXt
  if (successFlag) {
    for (i = 0; i < xOrder; i++) {
      for (j = 0; j < yOrder; j++) {
        mt[i][j] = 0.0;
        for (k = 0; k < xOrder; k++) {
          mt[i][j] += XXtI[i][k] * XYt[k][j];
        }
      }
    }
  }

  // Fix up any of the solutions that correspond to the homogeneous equation
  // problem.
  if (someHomogeneous) {
    for (j = 0; j < yOrder; j++) {
      if (homogenFlags[j]) {
        // Fix this one
        for (i = 0; i < xOrder; i++) {
          mt[i][j] = hmt[i][0];
        }
      }
    }
  }

  if (someHomogeneous) {
    return homogRC && successFlag;
  }

  return successFlag;
}

function hex2float(hexStr, outFloatArray = [0, 0.5, 1]) {
  switch (hexStr.length) {
    case 3: // abc => #aabbcc
      outFloatArray[0] = (parseInt(hexStr[0], 16) * 17) / 255;
      outFloatArray[1] = (parseInt(hexStr[1], 16) * 17) / 255;
      outFloatArray[2] = (parseInt(hexStr[2], 16) * 17) / 255;
      return outFloatArray;
    case 4: // #abc => #aabbcc
      outFloatArray[0] = (parseInt(hexStr[1], 16) * 17) / 255;
      outFloatArray[1] = (parseInt(hexStr[2], 16) * 17) / 255;
      outFloatArray[2] = (parseInt(hexStr[3], 16) * 17) / 255;
      return outFloatArray;
    case 6: // ab01df => #ab01df
      outFloatArray[0] = parseInt(hexStr.substr(0, 2), 16) / 255;
      outFloatArray[1] = parseInt(hexStr.substr(2, 2), 16) / 255;
      outFloatArray[2] = parseInt(hexStr.substr(4, 2), 16) / 255;
      return outFloatArray;
    case 7: // #ab01df
      outFloatArray[0] = parseInt(hexStr.substr(1, 2), 16) / 255;
      outFloatArray[1] = parseInt(hexStr.substr(3, 2), 16) / 255;
      outFloatArray[2] = parseInt(hexStr.substr(5, 2), 16) / 255;
      return outFloatArray;
    case 9: // #ab01df00
      outFloatArray[0] = parseInt(hexStr.substr(1, 2), 16) / 255;
      outFloatArray[1] = parseInt(hexStr.substr(3, 2), 16) / 255;
      outFloatArray[2] = parseInt(hexStr.substr(5, 2), 16) / 255;
      outFloatArray[3] = parseInt(hexStr.substr(7, 2), 16) / 255;
      return outFloatArray;
    default:
      return outFloatArray;
  }
}

function rgb2hsv(rgb, hsv) {
  let h;
  let s;
  const [r, g, b] = rgb;
  const onethird = 1.0 / 3.0;
  const onesixth = 1.0 / 6.0;
  const twothird = 2.0 / 3.0;

  let cmax = r;
  let cmin = r;

  if (g > cmax) {
    cmax = g;
  } else if (g < cmin) {
    cmin = g;
  }
  if (b > cmax) {
    cmax = b;
  } else if (b < cmin) {
    cmin = b;
  }
  const v = cmax;

  if (v > 0.0) {
    s = (cmax - cmin) / cmax;
  } else {
    s = 0.0;
  }
  if (s > 0) {
    if (r === cmax) {
      h = (onesixth * (g - b)) / (cmax - cmin);
    } else if (g === cmax) {
      h = onethird + (onesixth * (b - r)) / (cmax - cmin);
    } else {
      h = twothird + (onesixth * (r - g)) / (cmax - cmin);
    }
    if (h < 0.0) {
      h += 1.0;
    }
  } else {
    h = 0.0;
  }

  // Set the values back to the array
  hsv[0] = h;
  hsv[1] = s;
  hsv[2] = v;
}

function hsv2rgb(hsv, rgb) {
  const [h, s, v] = hsv;
  const onethird = 1.0 / 3.0;
  const onesixth = 1.0 / 6.0;
  const twothird = 2.0 / 3.0;
  const fivesixth = 5.0 / 6.0;
  let r;
  let g;
  let b;

  // compute RGB from HSV
  if (h > onesixth && h <= onethird) {
    // green/red
    g = 1.0;
    r = (onethird - h) / onesixth;
    b = 0.0;
  } else if (h > onethird && h <= 0.5) {
    // green/blue
    g = 1.0;
    b = (h - onethird) / onesixth;
    r = 0.0;
  } else if (h > 0.5 && h <= twothird) {
    // blue/green
    b = 1.0;
    g = (twothird - h) / onesixth;
    r = 0.0;
  } else if (h > twothird && h <= fivesixth) {
    // blue/red
    b = 1.0;
    r = (h - twothird) / onesixth;
    g = 0.0;
  } else if (h > fivesixth && h <= 1.0) {
    // red/blue
    r = 1.0;
    b = (1.0 - h) / onesixth;
    g = 0.0;
  } else {
    // red/green
    r = 1.0;
    g = h / onesixth;
    b = 0.0;
  }

  // add Saturation to the equation.
  r = s * r + (1.0 - s);
  g = s * g + (1.0 - s);
  b = s * b + (1.0 - s);

  r *= v;
  g *= v;
  b *= v;

  // Assign back to the array
  rgb[0] = r;
  rgb[1] = g;
  rgb[2] = b;
}

function lab2xyz(lab, xyz) {
  // LAB to XYZ
  const [L, a, b] = lab;
  let var_Y = (L + 16) / 116;
  let var_X = a / 500 + var_Y;
  let var_Z = var_Y - b / 200;

  if (var_Y ** 3 > 0.008856) {
    var_Y **= 3;
  } else {
    var_Y = (var_Y - 16.0 / 116.0) / 7.787;
  }

  if (var_X ** 3 > 0.008856) {
    var_X **= 3;
  } else {
    var_X = (var_X - 16.0 / 116.0) / 7.787;
  }

  if (var_Z ** 3 > 0.008856) {
    var_Z **= 3;
  } else {
    var_Z = (var_Z - 16.0 / 116.0) / 7.787;
  }
  const ref_X = 0.9505;
  const ref_Y = 1.0;
  const ref_Z = 1.089;
  xyz[0] = ref_X * var_X; // ref_X = 0.9505  Observer= 2 deg Illuminant= D65
  xyz[1] = ref_Y * var_Y; // ref_Y = 1.000
  xyz[2] = ref_Z * var_Z; // ref_Z = 1.089
}

function xyz2lab(xyz, lab) {
  const [x, y, z] = xyz;
  const ref_X = 0.9505;
  const ref_Y = 1.0;
  const ref_Z = 1.089;
  let var_X = x / ref_X; // ref_X = 0.9505  Observer= 2 deg, Illuminant= D65
  let var_Y = y / ref_Y; // ref_Y = 1.000
  let var_Z = z / ref_Z; // ref_Z = 1.089

  if (var_X > 0.008856) var_X **= 1.0 / 3.0;
  else var_X = 7.787 * var_X + 16.0 / 116.0;
  if (var_Y > 0.008856) var_Y **= 1.0 / 3.0;
  else var_Y = 7.787 * var_Y + 16.0 / 116.0;
  if (var_Z > 0.008856) var_Z **= 1.0 / 3.0;
  else var_Z = 7.787 * var_Z + 16.0 / 116.0;

  lab[0] = 116 * var_Y - 16;
  lab[1] = 500 * (var_X - var_Y);
  lab[2] = 200 * (var_Y - var_Z);
}

function xyz2rgb(xyz, rgb) {
  const [x, y, z] = xyz;
  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let b = x * 0.0557 + y * -0.204 + z * 1.057;

  // The following performs a "gamma correction" specified by the sRGB color
  // space.  sRGB is defined by a canonical definition of a display monitor and
  // has been standardized by the International Electrotechnical Commission (IEC
  // 61966-2-1).  The nonlinearity of the correction is designed to make the
  // colors more perceptually uniform.  This color space has been adopted by
  // several applications including Adobe Photoshop and Microsoft Windows color
  // management.  OpenGL is agnostic on its RGB color space, but it is reasonable
  // to assume it is close to this one.
  if (r > 0.0031308) r = 1.055 * r ** (1 / 2.4) - 0.055;
  else r *= 12.92;
  if (g > 0.0031308) g = 1.055 * g ** (1 / 2.4) - 0.055;
  else g *= 12.92;
  if (b > 0.0031308) b = 1.055 * b ** (1 / 2.4) - 0.055;
  else b *= 12.92;

  // Clip colors. ideally we would do something that is perceptually closest
  // (since we can see colors outside of the display gamut), but this seems to
  // work well enough.
  let maxVal = r;
  if (maxVal < g) maxVal = g;
  if (maxVal < b) maxVal = b;
  if (maxVal > 1.0) {
    r /= maxVal;
    g /= maxVal;
    b /= maxVal;
  }
  if (r < 0) r = 0;
  if (g < 0) g = 0;
  if (b < 0) b = 0;

  // Push values back to array
  rgb[0] = r;
  rgb[1] = g;
  rgb[2] = b;
}

function rgb2xyz(rgb, xyz) {
  let [r, g, b] = rgb;
  // The following performs a "gamma correction" specified by the sRGB color
  // space.  sRGB is defined by a canonical definition of a display monitor and
  // has been standardized by the International Electrotechnical Commission (IEC
  // 61966-2-1).  The nonlinearity of the correction is designed to make the
  // colors more perceptually uniform.  This color space has been adopted by
  // several applications including Adobe Photoshop and Microsoft Windows color
  // management.  OpenGL is agnostic on its RGB color space, but it is reasonable
  // to assume it is close to this one.
  if (r > 0.04045) r = ((r + 0.055) / 1.055) ** 2.4;
  else r /= 12.92;
  if (g > 0.04045) g = ((g + 0.055) / 1.055) ** 2.4;
  else g /= 12.92;
  if (b > 0.04045) b = ((b + 0.055) / 1.055) ** 2.4;
  else b /= 12.92;

  // Observer. = 2 deg, Illuminant = D65
  xyz[0] = r * 0.4124 + g * 0.3576 + b * 0.1805;
  xyz[1] = r * 0.2126 + g * 0.7152 + b * 0.0722;
  xyz[2] = r * 0.0193 + g * 0.1192 + b * 0.9505;
}

function rgb2lab(rgb, lab) {
  const xyz = [0, 0, 0];
  rgb2xyz(rgb, xyz);
  xyz2lab(xyz, lab);
}

function lab2rgb(lab, rgb) {
  const xyz = [0, 0, 0];
  lab2xyz(lab, xyz);
  xyz2rgb(xyz, rgb);
}

function uninitializeBounds(bounds) {
  bounds[0] = 1.0;
  bounds[1] = -1.0;
  bounds[2] = 1.0;
  bounds[3] = -1.0;
  bounds[4] = 1.0;
  bounds[5] = -1.0;
}

function areBoundsInitialized(bounds) {
  return !(bounds[1] - bounds[0] < 0.0);
}

function computeBoundsFromPoints(point1, point2, bounds) {
  bounds[0] = Math.min(point1[0], point2[0]);
  bounds[1] = Math.max(point1[0], point2[0]);
  bounds[2] = Math.min(point1[1], point2[1]);
  bounds[3] = Math.max(point1[1], point2[1]);
  bounds[4] = Math.min(point1[2], point2[2]);
  bounds[5] = Math.max(point1[2], point2[2]);
}

function clampValue(value, minValue, maxValue) {
  if (value < minValue) {
    return minValue;
  }
  if (value > maxValue) {
    return maxValue;
  }
  return value;
}

function clampVector(vector, minVector, maxVector, out = []) {
  out[0] = clampValue(vector[0], minVector[0], maxVector[0]);
  out[1] = clampValue(vector[1], minVector[1], maxVector[1]);
  out[2] = clampValue(vector[2], minVector[2], maxVector[2]);

  return out;
}

function roundVector(vector, out = []) {
  out[0] = Math.round(vector[0]);
  out[1] = Math.round(vector[1]);
  out[2] = Math.round(vector[2]);

  return out;
}

function clampAndNormalizeValue(value, range) {
  let result = 0;
  if (range[0] !== range[1]) {
    // clamp
    if (value < range[0]) {
      result = range[0];
    } else if (value > range[1]) {
      result = range[1];
    } else {
      result = value;
    }
    // normalize
    result = (result - range[0]) / (range[1] - range[0]);
  }

  return result;
}

const getScalarTypeFittingRange = notImplemented(
  'GetScalarTypeFittingRange'
);
const getAdjustedScalarRange = notImplemented('GetAdjustedScalarRange');

function extentIsWithinOtherExtent(extent1, extent2) {
  if (!extent1 || !extent2) {
    return 0;
  }

  for (let i = 0; i < 6; i += 2) {
    if (
      extent1[i] < extent2[i] ||
      extent1[i] > extent2[i + 1] ||
      extent1[i + 1] < extent2[i] ||
      extent1[i + 1] > extent2[i + 1]
    ) {
      return 0;
    }
  }

  return 1;
}

function boundsIsWithinOtherBounds(bounds1_6, bounds2_6, delta_3) {
  if (!bounds1_6 || !bounds2_6) {
    return 0;
  }
  for (let i = 0; i < 6; i += 2) {
    if (
      bounds1_6[i] + delta_3[i / 2] < bounds2_6[i] ||
      bounds1_6[i] - delta_3[i / 2] > bounds2_6[i + 1] ||
      bounds1_6[i + 1] + delta_3[i / 2] < bounds2_6[i] ||
      bounds1_6[i + 1] - delta_3[i / 2] > bounds2_6[i + 1]
    ) {
      return 0;
    }
  }
  return 1;
}

function pointIsWithinBounds(point_3, bounds_6, delta_3) {
  if (!point_3 || !bounds_6 || !delta_3) {
    return 0;
  }
  for (let i = 0; i < 3; i++) {
    if (
      point_3[i] + delta_3[i] < bounds_6[2 * i] ||
      point_3[i] - delta_3[i] > bounds_6[2 * i + 1]
    ) {
      return 0;
    }
  }
  return 1;
}

function solve3PointCircle(p1, p2, p3, center) {
  const v21 = createArray(3);
  const v32 = createArray(3);
  const v13 = createArray(3);
  const v12 = createArray(3);
  const v23 = createArray(3);
  const v31 = createArray(3);

  for (let i = 0; i < 3; ++i) {
    v21[i] = p1[i] - p2[i];
    v32[i] = p2[i] - p3[i];
    v13[i] = p3[i] - p1[i];
    v12[i] = -v21[i];
    v23[i] = -v32[i];
    v31[i] = -v13[i];
  }

  const norm12 = norm(v12);
  const norm23 = norm(v23);
  const norm13 = norm(v13);

  const crossv21v32 = createArray(3);
  cross(v21, v32, crossv21v32);
  const normCross = norm(crossv21v32);

  const radius = (norm12 * norm23 * norm13) / (2 * normCross);

  const normCross22 = 2 * normCross * normCross;
  const alpha = (norm23 * norm23 * dot(v21, v31)) / normCross22;
  const beta = (norm13 * norm13 * dot(v12, v32)) / normCross22;
  const gamma = (norm12 * norm12 * dot(v13, v23)) / normCross22;

  for (let i = 0; i < 3; ++i) {
    center[i] = alpha * p1[i] + beta * p2[i] + gamma * p3[i];
  }
  return radius;
}

const inf = Infinity;
const negInf = -Infinity;

const isInf = (value) => !Number.isFinite(value);
const { isFinite, isNaN } = Number;
const isNan = isNaN;

// JavaScript - add-on ----------------------

function createUninitializedBounds() {
  return [].concat([
    Number.MAX_VALUE,
    -Number.MAX_VALUE, // X
    Number.MAX_VALUE,
    -Number.MAX_VALUE, // Y
    Number.MAX_VALUE,
    -Number.MAX_VALUE, // Z
  ]);
}

function getMajorAxisIndex(vector) {
  let maxValue = -1;
  let axisIndex = -1;
  for (let i = 0; i < vector.length; i++) {
    const value = Math.abs(vector[i]);
    if (value > maxValue) {
      axisIndex = i;
      maxValue = value;
    }
  }

  return axisIndex;
}

function floatToHex2(value) {
  const integer = Math.floor(value * 255);
  if (integer > 15) {
    return integer.toString(16);
  }
  return `0${integer.toString(16)}`;
}

function floatRGB2HexCode(rgbArray, prefix = '#') {
  return `${prefix}${rgbArray.map(floatToHex2).join('')}`;
}

function floatToChar(f) {
  return Math.round(f * 255);
}

function float2CssRGBA(rgbArray) {
  if (rgbArray.length === 3) {
    return `rgb(${rgbArray.map(floatToChar).join(', ')})`;
  }
  return `rgba(${floatToChar(rgbArray[0] || 0)}, ${floatToChar(
    rgbArray[1] || 0
  )}, ${floatToChar(rgbArray[2] || 0)}, ${rgbArray[3] || 0})`;
}

// ----------------------------------------------------------------------------
// Only Static API
// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  Pi,
  radiansFromDegrees,
  degreesFromRadians,
  round,
  floor,
  ceil,
  ceilLog2,
  min,
  max,
  arrayMin,
  arrayMax,
  arrayRange,
  isPowerOfTwo,
  nearestPowerOfTwo,
  factorial,
  binomial,
  beginCombination,
  nextCombination,
  randomSeed,
  getSeed,
  random,
  gaussian,
  add,
  subtract,
  multiplyScalar,
  multiplyScalar2D,
  multiplyAccumulate,
  multiplyAccumulate2D,
  dot,
  outer,
  cross,
  norm,
  normalize,
  perpendiculars,
  projectVector,
  projectVector2D,
  distance2BetweenPoints,
  angleBetweenVectors,
  gaussianAmplitude,
  gaussianWeight,
  dot2D,
  outer2D,
  norm2D,
  normalize2D,
  determinant2x2,
  LUFactor3x3,
  LUSolve3x3,
  linearSolve3x3,
  multiply3x3_vect3,
  multiply3x3_mat3,
  multiplyMatrix,
  transpose3x3,
  invert3x3,
  identity3x3,
  determinant3x3,
  quaternionToMatrix3x3,
  areEquals,
  areMatricesEqual,
  matrix3x3ToQuaternion,
  multiplyQuaternion,
  orthogonalize3x3,
  diagonalize3x3,
  singularValueDecomposition3x3,
  solveLinearSystem,
  invertMatrix,
  luFactorLinearSystem,
  luSolveLinearSystem,
  estimateMatrixCondition,
  jacobi,
  jacobiN,
  solveHomogeneousLeastSquares,
  solveLeastSquares,
  hex2float,
  rgb2hsv,
  hsv2rgb,
  lab2xyz,
  xyz2lab,
  xyz2rgb,
  rgb2xyz,
  rgb2lab,
  lab2rgb,
  uninitializeBounds,
  areBoundsInitialized,
  computeBoundsFromPoints,
  clampValue,
  clampVector,
  clampAndNormalizeValue,
  getScalarTypeFittingRange,
  getAdjustedScalarRange,
  extentIsWithinOtherExtent,
  boundsIsWithinOtherBounds,
  pointIsWithinBounds,
  solve3PointCircle,
  inf,
  negInf,
  isInf,
  isNan: isNaN,
  isNaN,
  isFinite,

  // JS add-on
  createUninitializedBounds,
  getMajorAxisIndex,
  floatToHex2,
  floatRGB2HexCode,
  float2CssRGBA,
});


/***/ }),
/* 18 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// A library of seedable RNGs implemented in Javascript.
//
// Usage:
//
// var seedrandom = require('seedrandom');
// var random = seedrandom(1); // or any seed.
// var x = random();       // 0 <= x < 1.  Every bit is random.
// var x = random.quick(); // 0 <= x < 1.  32 bits of randomness.

// alea, a 53-bit multiply-with-carry generator by Johannes Baagøe.
// Period: ~2^116
// Reported to pass all BigCrush tests.
var alea = __webpack_require__(19);

// xor128, a pure xor-shift generator by George Marsaglia.
// Period: 2^128-1.
// Reported to fail: MatrixRank and LinearComp.
var xor128 = __webpack_require__(20);

// xorwow, George Marsaglia's 160-bit xor-shift combined plus weyl.
// Period: 2^192-2^32
// Reported to fail: CollisionOver, SimpPoker, and LinearComp.
var xorwow = __webpack_require__(21);

// xorshift7, by François Panneton and Pierre L'ecuyer, takes
// a different approach: it adds robustness by allowing more shifts
// than Marsaglia's original three.  It is a 7-shift generator
// with 256 bits, that passes BigCrush with no systmatic failures.
// Period 2^256-1.
// No systematic BigCrush failures reported.
var xorshift7 = __webpack_require__(22);

// xor4096, by Richard Brent, is a 4096-bit xor-shift with a
// very long period that also adds a Weyl generator. It also passes
// BigCrush with no systematic failures.  Its long period may
// be useful if you have many generators and need to avoid
// collisions.
// Period: 2^4128-2^32.
// No systematic BigCrush failures reported.
var xor4096 = __webpack_require__(23);

// Tyche-i, by Samuel Neves and Filipe Araujo, is a bit-shifting random
// number generator derived from ChaCha, a modern stream cipher.
// https://eden.dei.uc.pt/~sneves/pubs/2011-snfa2.pdf
// Period: ~2^127
// No systematic BigCrush failures reported.
var tychei = __webpack_require__(24);

// The original ARC4-based prng included in this library.
// Period: ~2^1600
var sr = __webpack_require__(25);

sr.alea = alea;
sr.xor128 = xor128;
sr.xorwow = xorwow;
sr.xorshift7 = xorshift7;
sr.xor4096 = xor4096;
sr.tychei = tychei;

module.exports = sr;


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

/* module decorator */ module = __webpack_require__.nmd(module);
var __WEBPACK_AMD_DEFINE_RESULT__;// A port of an algorithm by Johannes Baagøe <baagoe@baagoe.com>, 2010
// http://baagoe.com/en/RandomMusings/javascript/
// https://github.com/nquinlan/better-random-numbers-for-javascript-mirror
// Original work is under MIT license -

// Copyright (C) 2010 by Johannes Baagøe <baagoe@baagoe.org>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.



(function(global, module, define) {

function Alea(seed) {
  var me = this, mash = Mash();

  me.next = function() {
    var t = 2091639 * me.s0 + me.c * 2.3283064365386963e-10; // 2^-32
    me.s0 = me.s1;
    me.s1 = me.s2;
    return me.s2 = t - (me.c = t | 0);
  };

  // Apply the seeding algorithm from Baagoe.
  me.c = 1;
  me.s0 = mash(' ');
  me.s1 = mash(' ');
  me.s2 = mash(' ');
  me.s0 -= mash(seed);
  if (me.s0 < 0) { me.s0 += 1; }
  me.s1 -= mash(seed);
  if (me.s1 < 0) { me.s1 += 1; }
  me.s2 -= mash(seed);
  if (me.s2 < 0) { me.s2 += 1; }
  mash = null;
}

function copy(f, t) {
  t.c = f.c;
  t.s0 = f.s0;
  t.s1 = f.s1;
  t.s2 = f.s2;
  return t;
}

function impl(seed, opts) {
  var xg = new Alea(seed),
      state = opts && opts.state,
      prng = xg.next;
  prng.int32 = function() { return (xg.next() * 0x100000000) | 0; }
  prng.double = function() {
    return prng() + (prng() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
  };
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

function Mash() {
  var n = 0xefc8249d;

  var mash = function(data) {
    data = String(data);
    for (var i = 0; i < data.length; i++) {
      n += data.charCodeAt(i);
      var h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };

  return mash;
}


if (module && module.exports) {
  module.exports = impl;
} else if (__webpack_require__.amdD && __webpack_require__.amdO) {
  !(__WEBPACK_AMD_DEFINE_RESULT__ = (function() { return impl; }).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
} else {
  this.alea = impl;
}

})(
  this,
   true && module,    // present in node.js
  __webpack_require__.amdD   // present with an AMD loader
);




/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

/* module decorator */ module = __webpack_require__.nmd(module);
var __WEBPACK_AMD_DEFINE_RESULT__;// A Javascript implementaion of the "xor128" prng algorithm by
// George Marsaglia.  See http://www.jstatsoft.org/v08/i14/paper

(function(global, module, define) {

function XorGen(seed) {
  var me = this, strseed = '';

  me.x = 0;
  me.y = 0;
  me.z = 0;
  me.w = 0;

  // Set up generator function.
  me.next = function() {
    var t = me.x ^ (me.x << 11);
    me.x = me.y;
    me.y = me.z;
    me.z = me.w;
    return me.w ^= (me.w >>> 19) ^ t ^ (t >>> 8);
  };

  if (seed === (seed | 0)) {
    // Integer seed.
    me.x = seed;
  } else {
    // String seed.
    strseed += seed;
  }

  // Mix in string seed, then discard an initial batch of 64 values.
  for (var k = 0; k < strseed.length + 64; k++) {
    me.x ^= strseed.charCodeAt(k) | 0;
    me.next();
  }
}

function copy(f, t) {
  t.x = f.x;
  t.y = f.y;
  t.z = f.z;
  t.w = f.w;
  return t;
}

function impl(seed, opts) {
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (__webpack_require__.amdD && __webpack_require__.amdO) {
  !(__WEBPACK_AMD_DEFINE_RESULT__ = (function() { return impl; }).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
} else {
  this.xor128 = impl;
}

})(
  this,
   true && module,    // present in node.js
  __webpack_require__.amdD   // present with an AMD loader
);




/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

/* module decorator */ module = __webpack_require__.nmd(module);
var __WEBPACK_AMD_DEFINE_RESULT__;// A Javascript implementaion of the "xorwow" prng algorithm by
// George Marsaglia.  See http://www.jstatsoft.org/v08/i14/paper

(function(global, module, define) {

function XorGen(seed) {
  var me = this, strseed = '';

  // Set up generator function.
  me.next = function() {
    var t = (me.x ^ (me.x >>> 2));
    me.x = me.y; me.y = me.z; me.z = me.w; me.w = me.v;
    return (me.d = (me.d + 362437 | 0)) +
       (me.v = (me.v ^ (me.v << 4)) ^ (t ^ (t << 1))) | 0;
  };

  me.x = 0;
  me.y = 0;
  me.z = 0;
  me.w = 0;
  me.v = 0;

  if (seed === (seed | 0)) {
    // Integer seed.
    me.x = seed;
  } else {
    // String seed.
    strseed += seed;
  }

  // Mix in string seed, then discard an initial batch of 64 values.
  for (var k = 0; k < strseed.length + 64; k++) {
    me.x ^= strseed.charCodeAt(k) | 0;
    if (k == strseed.length) {
      me.d = me.x << 10 ^ me.x >>> 4;
    }
    me.next();
  }
}

function copy(f, t) {
  t.x = f.x;
  t.y = f.y;
  t.z = f.z;
  t.w = f.w;
  t.v = f.v;
  t.d = f.d;
  return t;
}

function impl(seed, opts) {
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (__webpack_require__.amdD && __webpack_require__.amdO) {
  !(__WEBPACK_AMD_DEFINE_RESULT__ = (function() { return impl; }).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
} else {
  this.xorwow = impl;
}

})(
  this,
   true && module,    // present in node.js
  __webpack_require__.amdD   // present with an AMD loader
);




/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

/* module decorator */ module = __webpack_require__.nmd(module);
var __WEBPACK_AMD_DEFINE_RESULT__;// A Javascript implementaion of the "xorshift7" algorithm by
// François Panneton and Pierre L'ecuyer:
// "On the Xorgshift Random Number Generators"
// http://saluc.engr.uconn.edu/refs/crypto/rng/panneton05onthexorshift.pdf

(function(global, module, define) {

function XorGen(seed) {
  var me = this;

  // Set up generator function.
  me.next = function() {
    // Update xor generator.
    var X = me.x, i = me.i, t, v, w;
    t = X[i]; t ^= (t >>> 7); v = t ^ (t << 24);
    t = X[(i + 1) & 7]; v ^= t ^ (t >>> 10);
    t = X[(i + 3) & 7]; v ^= t ^ (t >>> 3);
    t = X[(i + 4) & 7]; v ^= t ^ (t << 7);
    t = X[(i + 7) & 7]; t = t ^ (t << 13); v ^= t ^ (t << 9);
    X[i] = v;
    me.i = (i + 1) & 7;
    return v;
  };

  function init(me, seed) {
    var j, w, X = [];

    if (seed === (seed | 0)) {
      // Seed state array using a 32-bit integer.
      w = X[0] = seed;
    } else {
      // Seed state using a string.
      seed = '' + seed;
      for (j = 0; j < seed.length; ++j) {
        X[j & 7] = (X[j & 7] << 15) ^
            (seed.charCodeAt(j) + X[(j + 1) & 7] << 13);
      }
    }
    // Enforce an array length of 8, not all zeroes.
    while (X.length < 8) X.push(0);
    for (j = 0; j < 8 && X[j] === 0; ++j);
    if (j == 8) w = X[7] = -1; else w = X[j];

    me.x = X;
    me.i = 0;

    // Discard an initial 256 values.
    for (j = 256; j > 0; --j) {
      me.next();
    }
  }

  init(me, seed);
}

function copy(f, t) {
  t.x = f.x.slice();
  t.i = f.i;
  return t;
}

function impl(seed, opts) {
  if (seed == null) seed = +(new Date);
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (state.x) copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (__webpack_require__.amdD && __webpack_require__.amdO) {
  !(__WEBPACK_AMD_DEFINE_RESULT__ = (function() { return impl; }).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
} else {
  this.xorshift7 = impl;
}

})(
  this,
   true && module,    // present in node.js
  __webpack_require__.amdD   // present with an AMD loader
);



/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

/* module decorator */ module = __webpack_require__.nmd(module);
var __WEBPACK_AMD_DEFINE_RESULT__;// A Javascript implementaion of Richard Brent's Xorgens xor4096 algorithm.
//
// This fast non-cryptographic random number generator is designed for
// use in Monte-Carlo algorithms. It combines a long-period xorshift
// generator with a Weyl generator, and it passes all common batteries
// of stasticial tests for randomness while consuming only a few nanoseconds
// for each prng generated.  For background on the generator, see Brent's
// paper: "Some long-period random number generators using shifts and xors."
// http://arxiv.org/pdf/1004.3115v1.pdf
//
// Usage:
//
// var xor4096 = require('xor4096');
// random = xor4096(1);                        // Seed with int32 or string.
// assert.equal(random(), 0.1520436450538547); // (0, 1) range, 53 bits.
// assert.equal(random.int32(), 1806534897);   // signed int32, 32 bits.
//
// For nonzero numeric keys, this impelementation provides a sequence
// identical to that by Brent's xorgens 3 implementaion in C.  This
// implementation also provides for initalizing the generator with
// string seeds, or for saving and restoring the state of the generator.
//
// On Chrome, this prng benchmarks about 2.1 times slower than
// Javascript's built-in Math.random().

(function(global, module, define) {

function XorGen(seed) {
  var me = this;

  // Set up generator function.
  me.next = function() {
    var w = me.w,
        X = me.X, i = me.i, t, v;
    // Update Weyl generator.
    me.w = w = (w + 0x61c88647) | 0;
    // Update xor generator.
    v = X[(i + 34) & 127];
    t = X[i = ((i + 1) & 127)];
    v ^= v << 13;
    t ^= t << 17;
    v ^= v >>> 15;
    t ^= t >>> 12;
    // Update Xor generator array state.
    v = X[i] = v ^ t;
    me.i = i;
    // Result is the combination.
    return (v + (w ^ (w >>> 16))) | 0;
  };

  function init(me, seed) {
    var t, v, i, j, w, X = [], limit = 128;
    if (seed === (seed | 0)) {
      // Numeric seeds initialize v, which is used to generates X.
      v = seed;
      seed = null;
    } else {
      // String seeds are mixed into v and X one character at a time.
      seed = seed + '\0';
      v = 0;
      limit = Math.max(limit, seed.length);
    }
    // Initialize circular array and weyl value.
    for (i = 0, j = -32; j < limit; ++j) {
      // Put the unicode characters into the array, and shuffle them.
      if (seed) v ^= seed.charCodeAt((j + 32) % seed.length);
      // After 32 shuffles, take v as the starting w value.
      if (j === 0) w = v;
      v ^= v << 10;
      v ^= v >>> 15;
      v ^= v << 4;
      v ^= v >>> 13;
      if (j >= 0) {
        w = (w + 0x61c88647) | 0;     // Weyl.
        t = (X[j & 127] ^= (v + w));  // Combine xor and weyl to init array.
        i = (0 == t) ? i + 1 : 0;     // Count zeroes.
      }
    }
    // We have detected all zeroes; make the key nonzero.
    if (i >= 128) {
      X[(seed && seed.length || 0) & 127] = -1;
    }
    // Run the generator 512 times to further mix the state before using it.
    // Factoring this as a function slows the main generator, so it is just
    // unrolled here.  The weyl generator is not advanced while warming up.
    i = 127;
    for (j = 4 * 128; j > 0; --j) {
      v = X[(i + 34) & 127];
      t = X[i = ((i + 1) & 127)];
      v ^= v << 13;
      t ^= t << 17;
      v ^= v >>> 15;
      t ^= t >>> 12;
      X[i] = v ^ t;
    }
    // Storing state as object members is faster than using closure variables.
    me.w = w;
    me.X = X;
    me.i = i;
  }

  init(me, seed);
}

function copy(f, t) {
  t.i = f.i;
  t.w = f.w;
  t.X = f.X.slice();
  return t;
};

function impl(seed, opts) {
  if (seed == null) seed = +(new Date);
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (state.X) copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (__webpack_require__.amdD && __webpack_require__.amdO) {
  !(__WEBPACK_AMD_DEFINE_RESULT__ = (function() { return impl; }).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
} else {
  this.xor4096 = impl;
}

})(
  this,                                     // window object or global
   true && module,    // present in node.js
  __webpack_require__.amdD   // present with an AMD loader
);


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

/* module decorator */ module = __webpack_require__.nmd(module);
var __WEBPACK_AMD_DEFINE_RESULT__;// A Javascript implementaion of the "Tyche-i" prng algorithm by
// Samuel Neves and Filipe Araujo.
// See https://eden.dei.uc.pt/~sneves/pubs/2011-snfa2.pdf

(function(global, module, define) {

function XorGen(seed) {
  var me = this, strseed = '';

  // Set up generator function.
  me.next = function() {
    var b = me.b, c = me.c, d = me.d, a = me.a;
    b = (b << 25) ^ (b >>> 7) ^ c;
    c = (c - d) | 0;
    d = (d << 24) ^ (d >>> 8) ^ a;
    a = (a - b) | 0;
    me.b = b = (b << 20) ^ (b >>> 12) ^ c;
    me.c = c = (c - d) | 0;
    me.d = (d << 16) ^ (c >>> 16) ^ a;
    return me.a = (a - b) | 0;
  };

  /* The following is non-inverted tyche, which has better internal
   * bit diffusion, but which is about 25% slower than tyche-i in JS.
  me.next = function() {
    var a = me.a, b = me.b, c = me.c, d = me.d;
    a = (me.a + me.b | 0) >>> 0;
    d = me.d ^ a; d = d << 16 ^ d >>> 16;
    c = me.c + d | 0;
    b = me.b ^ c; b = b << 12 ^ d >>> 20;
    me.a = a = a + b | 0;
    d = d ^ a; me.d = d = d << 8 ^ d >>> 24;
    me.c = c = c + d | 0;
    b = b ^ c;
    return me.b = (b << 7 ^ b >>> 25);
  }
  */

  me.a = 0;
  me.b = 0;
  me.c = 2654435769 | 0;
  me.d = 1367130551;

  if (seed === Math.floor(seed)) {
    // Integer seed.
    me.a = (seed / 0x100000000) | 0;
    me.b = seed | 0;
  } else {
    // String seed.
    strseed += seed;
  }

  // Mix in string seed, then discard an initial batch of 64 values.
  for (var k = 0; k < strseed.length + 20; k++) {
    me.b ^= strseed.charCodeAt(k) | 0;
    me.next();
  }
}

function copy(f, t) {
  t.a = f.a;
  t.b = f.b;
  t.c = f.c;
  t.d = f.d;
  return t;
};

function impl(seed, opts) {
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (__webpack_require__.amdD && __webpack_require__.amdO) {
  !(__WEBPACK_AMD_DEFINE_RESULT__ = (function() { return impl; }).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
} else {
  this.tychei = impl;
}

})(
  this,
   true && module,    // present in node.js
  __webpack_require__.amdD   // present with an AMD loader
);




/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_RESULT__;/*
Copyright 2019 David Bau.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

(function (global, pool, math) {
//
// The following constants are related to IEEE 754 limits.
//

var width = 256,        // each RC4 output is 0 <= x < 256
    chunks = 6,         // at least six RC4 outputs for each double
    digits = 52,        // there are 52 significant digits in a double
    rngname = 'random', // rngname: name for Math.random and Math.seedrandom
    startdenom = math.pow(width, chunks),
    significance = math.pow(2, digits),
    overflow = significance * 2,
    mask = width - 1,
    nodecrypto;         // node.js crypto module, initialized at the bottom.

//
// seedrandom()
// This is the seedrandom function described above.
//
function seedrandom(seed, options, callback) {
  var key = [];
  options = (options == true) ? { entropy: true } : (options || {});

  // Flatten the seed string or build one from local entropy if needed.
  var shortseed = mixkey(flatten(
    options.entropy ? [seed, tostring(pool)] :
    (seed == null) ? autoseed() : seed, 3), key);

  // Use the seed to initialize an ARC4 generator.
  var arc4 = new ARC4(key);

  // This function returns a random double in [0, 1) that contains
  // randomness in every bit of the mantissa of the IEEE 754 value.
  var prng = function() {
    var n = arc4.g(chunks),             // Start with a numerator n < 2 ^ 48
        d = startdenom,                 //   and denominator d = 2 ^ 48.
        x = 0;                          //   and no 'extra last byte'.
    while (n < significance) {          // Fill up all significant digits by
      n = (n + x) * width;              //   shifting numerator and
      d *= width;                       //   denominator and generating a
      x = arc4.g(1);                    //   new least-significant-byte.
    }
    while (n >= overflow) {             // To avoid rounding up, before adding
      n /= 2;                           //   last byte, shift everything
      d /= 2;                           //   right using integer math until
      x >>>= 1;                         //   we have exactly the desired bits.
    }
    return (n + x) / d;                 // Form the number within [0, 1).
  };

  prng.int32 = function() { return arc4.g(4) | 0; }
  prng.quick = function() { return arc4.g(4) / 0x100000000; }
  prng.double = prng;

  // Mix the randomness into accumulated entropy.
  mixkey(tostring(arc4.S), pool);

  // Calling convention: what to return as a function of prng, seed, is_math.
  return (options.pass || callback ||
      function(prng, seed, is_math_call, state) {
        if (state) {
          // Load the arc4 state from the given state if it has an S array.
          if (state.S) { copy(state, arc4); }
          // Only provide the .state method if requested via options.state.
          prng.state = function() { return copy(arc4, {}); }
        }

        // If called as a method of Math (Math.seedrandom()), mutate
        // Math.random because that is how seedrandom.js has worked since v1.0.
        if (is_math_call) { math[rngname] = prng; return seed; }

        // Otherwise, it is a newer calling convention, so return the
        // prng directly.
        else return prng;
      })(
  prng,
  shortseed,
  'global' in options ? options.global : (this == math),
  options.state);
}

//
// ARC4
//
// An ARC4 implementation.  The constructor takes a key in the form of
// an array of at most (width) integers that should be 0 <= x < (width).
//
// The g(count) method returns a pseudorandom integer that concatenates
// the next (count) outputs from ARC4.  Its return value is a number x
// that is in the range 0 <= x < (width ^ count).
//
function ARC4(key) {
  var t, keylen = key.length,
      me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];

  // The empty key [] is treated as [0].
  if (!keylen) { key = [keylen++]; }

  // Set up S using the standard key scheduling algorithm.
  while (i < width) {
    s[i] = i++;
  }
  for (i = 0; i < width; i++) {
    s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
    s[j] = t;
  }

  // The "g" method returns the next (count) outputs as one number.
  (me.g = function(count) {
    // Using instance members instead of closure state nearly doubles speed.
    var t, r = 0,
        i = me.i, j = me.j, s = me.S;
    while (count--) {
      t = s[i = mask & (i + 1)];
      r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
    }
    me.i = i; me.j = j;
    return r;
    // For robust unpredictability, the function call below automatically
    // discards an initial batch of values.  This is called RC4-drop[256].
    // See http://google.com/search?q=rsa+fluhrer+response&btnI
  })(width);
}

//
// copy()
// Copies internal state of ARC4 to or from a plain object.
//
function copy(f, t) {
  t.i = f.i;
  t.j = f.j;
  t.S = f.S.slice();
  return t;
};

//
// flatten()
// Converts an object tree to nested arrays of strings.
//
function flatten(obj, depth) {
  var result = [], typ = (typeof obj), prop;
  if (depth && typ == 'object') {
    for (prop in obj) {
      try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
    }
  }
  return (result.length ? result : typ == 'string' ? obj : obj + '\0');
}

//
// mixkey()
// Mixes a string seed into a key that is an array of integers, and
// returns a shortened string seed that is equivalent to the result key.
//
function mixkey(seed, key) {
  var stringseed = seed + '', smear, j = 0;
  while (j < stringseed.length) {
    key[mask & j] =
      mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
  }
  return tostring(key);
}

//
// autoseed()
// Returns an object for autoseeding, using window.crypto and Node crypto
// module if available.
//
function autoseed() {
  try {
    var out;
    if (nodecrypto && (out = nodecrypto.randomBytes)) {
      // The use of 'out' to remember randomBytes makes tight minified code.
      out = out(width);
    } else {
      out = new Uint8Array(width);
      (global.crypto || global.msCrypto).getRandomValues(out);
    }
    return tostring(out);
  } catch (e) {
    var browser = global.navigator,
        plugins = browser && browser.plugins;
    return [+new Date, global, plugins, global.screen, tostring(pool)];
  }
}

//
// tostring()
// Converts an array of charcodes to a string
//
function tostring(a) {
  return String.fromCharCode.apply(0, a);
}

//
// When seedrandom.js is loaded, we immediately mix a few bits
// from the built-in RNG into the entropy pool.  Because we do
// not want to interfere with deterministic PRNG state later,
// seedrandom will not call math.random on its own again after
// initialization.
//
mixkey(math.random(), pool);

//
// Nodejs and AMD support: export the implementation as a module using
// either convention.
//
if ( true && module.exports) {
  module.exports = seedrandom;
  // When in node.js, try using crypto package for autoseeding.
  try {
    nodecrypto = __webpack_require__(26);
  } catch (ex) {}
} else if (true) {
  !(__WEBPACK_AMD_DEFINE_RESULT__ = (function() { return seedrandom; }).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
} else {}


// End anonymous scope, and pass initial values.
})(
  // global: `self` in browsers (including strict mode and web workers),
  // otherwise `this` in Node and other environments
  (typeof self !== 'undefined') ? self : this,
  [],     // pool: entropy pool starts empty
  Math    // math: package containing random, pow, and seedrandom
);


/***/ }),
/* 26 */
/***/ (() => {

/* (ignored) */

/***/ }),
/* 27 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "STATIC": () => (/* binding */ STATIC),
/* harmony export */   "vtkPlane": () => (/* binding */ vtkPlane),
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(17);
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(14);



const PLANE_TOLERANCE = 1.0e-6;
const COINCIDE = 'coincide';
const DISJOINT = 'disjoint';

// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

function evaluate(normal, origin, x) {
  return (
    normal[0] * (x[0] - origin[0]) +
    normal[1] * (x[1] - origin[1]) +
    normal[2] * (x[2] - origin[2])
  );
}

function distanceToPlane(x, origin, normal) {
  const distance =
    normal[0] * (x[0] - origin[0]) +
    normal[1] * (x[1] - origin[1]) +
    normal[2] * (x[2] - origin[2]);

  return Math.abs(distance);
}

function projectPoint(x, origin, normal, xproj) {
  const xo = [];
  vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.subtract(x, origin, xo);

  const t = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.dot(normal, xo);

  xproj[0] = x[0] - t * normal[0];
  xproj[1] = x[1] - t * normal[1];
  xproj[2] = x[2] - t * normal[2];
}

function projectVector(v, normal, vproj) {
  const t = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.dot(v, normal);

  let n2 = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.dot(normal, normal);
  if (n2 === 0) {
    n2 = 1.0;
  }

  vproj[0] = v[0] - (t * normal[0]) / n2;
  vproj[1] = v[1] - (t * normal[1]) / n2;
  vproj[2] = v[2] - (t * normal[2]) / n2;
}

function generalizedProjectPoint(x, origin, normal, xproj) {
  const xo = [];
  vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.subtract(x, origin, xo);

  const t = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.dot(normal, xo);
  const n2 = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.dot(normal, normal);

  if (n2 !== 0) {
    xproj[0] = x[0] - (t * normal[0]) / n2;
    xproj[1] = x[1] - (t * normal[1]) / n2;
    xproj[2] = x[2] - (t * normal[2]) / n2;
  } else {
    xproj[0] = x[0];
    xproj[1] = x[1];
    xproj[2] = x[2];
  }
}

function intersectWithLine(p1, p2, origin, normal) {
  const outObj = {
    intersection: false,
    betweenPoints: false,
    t: Number.MAX_VALUE,
    x: [],
  };

  const p21 = [];
  const p1Origin = [];
  // Compute line vector
  vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.subtract(p2, p1, p21);
  vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.subtract(origin, p1, p1Origin);

  // Compute denominator.  If ~0, line and plane are parallel.
  // const num = vtkMath.dot(normal, origin) - vtkMath.dot(normal, p1);
  const num = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.dot(normal, p1Origin);
  const den = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.dot(normal, p21);

  // If denominator with respect to numerator is "zero", then the line and
  // plane are considered parallel.
  let fabsden;
  let fabstolerance;

  // Trying to avoid an expensive call to fabs()
  if (den < 0.0) {
    fabsden = -den;
  } else {
    fabsden = den;
  }
  if (num < 0.0) {
    fabstolerance = -num * PLANE_TOLERANCE;
  } else {
    fabstolerance = num * PLANE_TOLERANCE;
  }
  if (fabsden <= fabstolerance) {
    return outObj;
  }

  // Where on the line between p1 and p2 is the intersection
  // If between 0 and 1, it is between the two points. If < 0 it's before p1, if > 1 it's after p2
  outObj.t = num / den;

  outObj.x[0] = p1[0] + outObj.t * p21[0];
  outObj.x[1] = p1[1] + outObj.t * p21[1];
  outObj.x[2] = p1[2] + outObj.t * p21[2];

  outObj.intersection = true;
  outObj.betweenPoints = outObj.t >= 0.0 && outObj.t <= 1.0;
  return outObj;
}

function intersectWithPlane(
  plane1Origin,
  plane1Normal,
  plane2Origin,
  plane2Normal
) {
  const outObj = {
    intersection: false,
    l0: [],
    l1: [],
    error: null,
  };

  const cross = [];
  vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.cross(plane1Normal, plane2Normal, cross);
  const absCross = cross.map((n) => Math.abs(n));

  // test if the two planes are parallel
  if (absCross[0] + absCross[1] + absCross[2] < PLANE_TOLERANCE) {
    // test if disjoint or coincide
    const v = [];
    vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.subtract(plane1Origin, plane2Origin, v);
    if (vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.dot(plane1Normal, v) === 0) {
      outObj.error = COINCIDE;
    } else {
      outObj.error = DISJOINT;
    }
    return outObj;
  }

  // Plane1 and Plane2 intersect in a line
  // first determine max abs coordinate of the cross product
  let maxc;
  if (absCross[0] > absCross[1] && absCross[0] > absCross[2]) {
    maxc = 'x';
  } else if (absCross[1] > absCross[2]) {
    maxc = 'y';
  } else {
    maxc = 'z';
  }

  // To get a point on the intersect line, zero the max coord, and solve for the other two
  const iP = []; // intersectionPoint
  // the constants in the 2 plane equations
  const d1 = -vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.dot(plane1Normal, plane1Origin);
  const d2 = -vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.dot(plane2Normal, plane2Origin);

  // eslint-disable-next-line default-case
  switch (maxc) {
    case 'x': // intersect with x=0
      iP[0] = 0;
      iP[1] = (d2 * plane1Normal[2] - d1 * plane2Normal[2]) / cross[0];
      iP[2] = (d1 * plane2Normal[1] - d2 * plane1Normal[1]) / cross[0];
      break;
    case 'y': // intersect with y=0
      iP[0] = (d1 * plane2Normal[2] - d2 * plane1Normal[2]) / cross[1];
      iP[1] = 0;
      iP[2] = (d2 * plane1Normal[0] - d1 * plane2Normal[0]) / cross[1];
      break;
    case 'z': // intersect with z=0
      iP[0] = (d2 * plane1Normal[1] - d1 * plane2Normal[1]) / cross[2];
      iP[1] = (d1 * plane2Normal[0] - d2 * plane1Normal[0]) / cross[2];
      iP[2] = 0;
      break;
  }

  outObj.l0 = iP;
  vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_0__.add(iP, cross, outObj.l1);
  outObj.intersection = true;

  return outObj;
}

// ----------------------------------------------------------------------------
// Static API
// ----------------------------------------------------------------------------

const STATIC = {
  evaluate,
  distanceToPlane,
  projectPoint,
  projectVector,
  generalizedProjectPoint,
  intersectWithLine,
  intersectWithPlane,
  DISJOINT,
  COINCIDE,
};

// ----------------------------------------------------------------------------
// vtkPlane methods
// ----------------------------------------------------------------------------

function vtkPlane(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkPlane');

  publicAPI.distanceToPlane = (x) =>
    distanceToPlane(x, model.origin, model.normal);

  publicAPI.projectPoint = (x, xproj) => {
    projectPoint(x, model.origin, model.normal, xproj);
  };

  publicAPI.projectVector = (v, vproj) => {
    projectVector(v, model.normal, vproj);
  };

  publicAPI.push = (distance) => {
    if (distance === 0.0) {
      return;
    }
    for (let i = 0; i < 3; i++) {
      model.origin[i] += distance * model.normal[i];
    }
  };

  publicAPI.generalizedProjectPoint = (x, xproj) => {
    generalizedProjectPoint(x, model.origin, model.normal, xproj);
  };

  publicAPI.evaluateFunction = (x, y, z) => {
    if (!Array.isArray(x)) {
      return (
        model.normal[0] * (x - model.origin[0]) +
        model.normal[1] * (y - model.origin[1]) +
        model.normal[2] * (z - model.origin[2])
      );
    }
    return (
      model.normal[0] * (x[0] - model.origin[0]) +
      model.normal[1] * (x[1] - model.origin[1]) +
      model.normal[2] * (x[2] - model.origin[2])
    );
  };

  publicAPI.evaluateGradient = (xyz) => {
    const retVal = [model.normal[0], model.normal[1], model.normal[2]];
    return retVal;
  };

  publicAPI.intersectWithLine = (p1, p2) =>
    intersectWithLine(p1, p2, model.origin, model.normal);

  publicAPI.intersectWithPlane = (planeOrigin, planeNormal) =>
    intersectWithPlane(planeOrigin, planeNormal, model.origin, model.normal);
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  normal: [0.0, 0.0, 1.0],
  origin: [0.0, 0.0, 0.0],
};

// ----------------------------------------------------------------------------

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Object methods
  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__.default.obj(publicAPI, model);

  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__.default.setGetArray(publicAPI, model, ['normal', 'origin'], 3);

  vtkPlane(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__.default.newInstance(extend, 'vtkPlane');

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend, ...STATIC });


/***/ }),
/* 28 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "STATIC": () => (/* binding */ STATIC),
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_Common_Core_DataArray_Constants__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(29);
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(14);
/* harmony import */ var vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(17);




const { DefaultDataType } = vtk_js_Sources_Common_Core_DataArray_Constants__WEBPACK_IMPORTED_MODULE_0__.default;
const TUPLE_HOLDER = [];

// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

function createRangeHelper() {
  let min = Number.MAX_VALUE;
  let max = -Number.MAX_VALUE;
  let count = 0;
  let sum = 0;

  return {
    add(value) {
      if (min > value) {
        min = value;
      }
      if (max < value) {
        max = value;
      }
      count++;
      sum += value;
    },
    get() {
      return { min, max, count, sum, mean: sum / count };
    },
    getRange() {
      return { min, max };
    },
  };
}

function computeRange(values, component = 0, numberOfComponents = 1) {
  const helper = createRangeHelper();
  const size = values.length;
  let value = 0;

  if (component < 0 && numberOfComponents > 1) {
    // Compute magnitude
    for (let i = 0; i < size; i += numberOfComponents) {
      value = 0;
      for (let j = 0; j < numberOfComponents; j++) {
        value += values[i + j] * values[i + j];
      }
      value **= 0.5;
      helper.add(value);
    }
    return helper.getRange();
  }

  const offset = component < 0 ? 0 : component;
  for (let i = offset; i < size; i += numberOfComponents) {
    helper.add(values[i]);
  }

  return helper.getRange();
}

function ensureRangeSize(rangeArray, size = 0) {
  const ranges = rangeArray || [];
  // Pad ranges with null value to get the
  while (ranges.length <= size) {
    ranges.push(null);
  }
  return ranges;
}

function getDataType(typedArray) {
  // Expects toString() to return "[object ...Array]"
  return Object.prototype.toString.call(typedArray).slice(8, -1);
}

function getMaxNorm(normArray) {
  const numComps = normArray.getNumberOfComponents();
  let maxNorm = 0.0;
  for (let i = 0; i < normArray.getNumberOfTuples(); ++i) {
    const norm = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_2__.norm(normArray.getTuple(i), numComps);
    if (norm > maxNorm) {
      maxNorm = norm;
    }
  }
  return maxNorm;
}

// ----------------------------------------------------------------------------
// Static API
// ----------------------------------------------------------------------------

const STATIC = {
  computeRange,
  createRangeHelper,
  getDataType,
  getMaxNorm,
};

// ----------------------------------------------------------------------------
// vtkDataArray methods
// ----------------------------------------------------------------------------

function vtkDataArray(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkDataArray');

  function dataChange() {
    model.ranges = null;
    publicAPI.modified();
  }

  publicAPI.getElementComponentSize = () => model.values.BYTES_PER_ELEMENT;

  // Description:
  // Return the data component at the location specified by tupleIdx and
  // compIdx.
  publicAPI.getComponent = (tupleIdx, compIdx = 0) =>
    model.values[tupleIdx * model.numberOfComponents + compIdx];

  // Description:
  // Set the data component at the location specified by tupleIdx and compIdx
  // to value.
  // Note that i is less than NumberOfTuples and j is less than
  //  NumberOfComponents. Make sure enough memory has been allocated
  // (use SetNumberOfTuples() and SetNumberOfComponents()).
  publicAPI.setComponent = (tupleIdx, compIdx, value) => {
    if (value !== model.values[tupleIdx * model.numberOfComponents + compIdx]) {
      model.values[tupleIdx * model.numberOfComponents + compIdx] = value;
      dataChange();
    }
  };

  publicAPI.getData = () => model.values;

  publicAPI.getRange = (componentIndex = -1) => {
    const rangeIdx =
      componentIndex < 0 ? model.numberOfComponents : componentIndex;
    let range = null;

    if (!model.ranges) {
      model.ranges = ensureRangeSize(model.ranges, model.numberOfComponents);
    }
    range = model.ranges[rangeIdx];

    if (range) {
      model.rangeTuple[0] = range.min;
      model.rangeTuple[1] = range.max;
      return model.rangeTuple;
    }

    // Need to compute ranges...
    range = computeRange(
      model.values,
      componentIndex,
      model.numberOfComponents
    );
    model.ranges[rangeIdx] = range;
    model.rangeTuple[0] = range.min;
    model.rangeTuple[1] = range.max;
    return model.rangeTuple;
  };

  publicAPI.setRange = (rangeValue, componentIndex) => {
    if (!model.ranges) {
      model.ranges = ensureRangeSize(model.ranges, model.numberOfComponents);
    }
    const range = { min: rangeValue.min, max: rangeValue.max };

    model.ranges[componentIndex] = range;
    model.rangeTuple[0] = range.min;
    model.rangeTuple[1] = range.max;

    return model.rangeTuple;
  };

  publicAPI.setTuple = (idx, tuple) => {
    const offset = idx * model.numberOfComponents;
    for (let i = 0; i < model.numberOfComponents; i++) {
      model.values[offset + i] = tuple[i];
    }
  };

  publicAPI.getTuple = (idx, tupleToFill = TUPLE_HOLDER) => {
    const numberOfComponents = model.numberOfComponents || 1;
    if (tupleToFill.length !== numberOfComponents) {
      tupleToFill.length = numberOfComponents;
    }
    const offset = idx * numberOfComponents;
    // Check most common component sizes first
    // to avoid doing a for loop if possible
    if (numberOfComponents === 1) {
      tupleToFill[0] = model.values[offset];
    } else if (numberOfComponents === 2) {
      tupleToFill[0] = model.values[offset];
      tupleToFill[1] = model.values[offset + 1];
    } else if (numberOfComponents === 3) {
      tupleToFill[0] = model.values[offset];
      tupleToFill[1] = model.values[offset + 1];
      tupleToFill[2] = model.values[offset + 2];
    } else if (numberOfComponents === 4) {
      tupleToFill[0] = model.values[offset];
      tupleToFill[1] = model.values[offset + 1];
      tupleToFill[2] = model.values[offset + 2];
      tupleToFill[3] = model.values[offset + 3];
    } else {
      for (let i = 0; i < numberOfComponents; i++) {
        tupleToFill[i] = model.values[offset + i];
      }
    }
    return tupleToFill;
  };

  publicAPI.getTupleLocation = (idx = 1) => idx * model.numberOfComponents;
  publicAPI.getNumberOfComponents = () => model.numberOfComponents;
  publicAPI.getNumberOfValues = () => model.values.length;
  publicAPI.getNumberOfTuples = () =>
    model.values.length / model.numberOfComponents;
  publicAPI.getDataType = () => model.dataType;
  /* eslint-disable no-use-before-define */
  publicAPI.newClone = () =>
    newInstance({
      empty: true,
      name: model.name,
      dataType: model.dataType,
      numberOfComponents: model.numberOfComponents,
    });
  /* eslint-enable no-use-before-define */

  publicAPI.getName = () => {
    if (!model.name) {
      publicAPI.modified();
      model.name = `vtkDataArray${publicAPI.getMTime()}`;
    }
    return model.name;
  };

  publicAPI.setData = (typedArray, numberOfComponents) => {
    model.values = typedArray;
    model.size = typedArray.length;
    model.dataType = getDataType(typedArray);
    if (numberOfComponents) {
      model.numberOfComponents = numberOfComponents;
    }
    if (model.size % model.numberOfComponents !== 0) {
      model.numberOfComponents = 1;
    }
    dataChange();
  };

  // Override serialization support
  publicAPI.getState = () => {
    const jsonArchive = { ...model, vtkClass: publicAPI.getClassName() };

    // Convert typed array to regular array
    jsonArchive.values = Array.from(jsonArchive.values);
    delete jsonArchive.buffer;

    // Clean any empty data
    Object.keys(jsonArchive).forEach((keyName) => {
      if (!jsonArchive[keyName]) {
        delete jsonArchive[keyName];
      }
    });

    // Sort resulting object by key name
    const sortedObj = {};
    Object.keys(jsonArchive)
      .sort()
      .forEach((name) => {
        sortedObj[name] = jsonArchive[name];
      });

    // Remove mtime
    if (sortedObj.mtime) {
      delete sortedObj.mtime;
    }

    return sortedObj;
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  name: '',
  numberOfComponents: 1,
  size: 0,
  dataType: DefaultDataType,
  rangeTuple: [0, 0],
  // values: null,
  // ranges: null,
};

// ----------------------------------------------------------------------------

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  if (!model.empty && !model.values && !model.size) {
    throw new TypeError(
      'Cannot create vtkDataArray object without: size > 0, values'
    );
  }

  if (!model.values) {
    model.values = new window[model.dataType](model.size);
  } else if (Array.isArray(model.values)) {
    model.values = window[model.dataType].from(model.values);
  }

  if (model.values) {
    model.size = model.values.length;
    model.dataType = getDataType(model.values);
  }

  // Object methods
  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__.obj(publicAPI, model);
  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__.set(publicAPI, model, ['name', 'numberOfComponents']);

  // Object specific methods
  vtkDataArray(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__.newInstance(extend, 'vtkDataArray');

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend, ...STATIC, ...vtk_js_Sources_Common_Core_DataArray_Constants__WEBPACK_IMPORTED_MODULE_0__.default });


/***/ }),
/* 29 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DataTypeByteSize": () => (/* binding */ DataTypeByteSize),
/* harmony export */   "VtkDataTypes": () => (/* binding */ VtkDataTypes),
/* harmony export */   "DefaultDataType": () => (/* binding */ DefaultDataType),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const DataTypeByteSize = {
  Int8Array: 1,
  Uint8Array: 1,
  Uint8ClampedArray: 1,
  Int16Array: 2,
  Uint16Array: 2,
  Int32Array: 4,
  Uint32Array: 4,
  Float32Array: 4,
  Float64Array: 8,
};

const VtkDataTypes = {
  VOID: '', // not sure to know what that should be
  CHAR: 'Int8Array',
  SIGNED_CHAR: 'Int8Array',
  UNSIGNED_CHAR: 'Uint8Array',
  SHORT: 'Int16Array',
  UNSIGNED_SHORT: 'Uint16Array',
  INT: 'Int32Array',
  UNSIGNED_INT: 'Uint32Array',
  FLOAT: 'Float32Array',
  DOUBLE: 'Float64Array',
};

const DefaultDataType = VtkDataTypes.FLOAT;

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  DefaultDataType,
  DataTypeByteSize,
  VtkDataTypes,
});


/***/ }),
/* 30 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AttributeTypes": () => (/* binding */ AttributeTypes),
/* harmony export */   "AttributeLimitTypes": () => (/* binding */ AttributeLimitTypes),
/* harmony export */   "CellGhostTypes": () => (/* binding */ CellGhostTypes),
/* harmony export */   "PointGhostTypes": () => (/* binding */ PointGhostTypes),
/* harmony export */   "AttributeCopyOperations": () => (/* binding */ AttributeCopyOperations),
/* harmony export */   "ghostArrayName": () => (/* binding */ ghostArrayName),
/* harmony export */   "DesiredOutputPrecision": () => (/* binding */ DesiredOutputPrecision),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const AttributeTypes = {
  SCALARS: 0,
  VECTORS: 1,
  NORMALS: 2,
  TCOORDS: 3,
  TENSORS: 4,
  GLOBALIDS: 5,
  PEDIGREEIDS: 6,
  EDGEFLAG: 7,
  NUM_ATTRIBUTES: 8,
};

const AttributeLimitTypes = {
  MAX: 0,
  EXACT: 1,
  NOLIMIT: 2,
};

const CellGhostTypes = {
  DUPLICATECELL: 1, // the cell is present on multiple processors
  HIGHCONNECTIVITYCELL: 2, // the cell has more neighbors than in a regular mesh
  LOWCONNECTIVITYCELL: 4, // the cell has less neighbors than in a regular mesh
  REFINEDCELL: 8, // other cells are present that refines it.
  EXTERIORCELL: 16, // the cell is on the exterior of the data set
  HIDDENCELL: 32, // the cell is needed to maintain connectivity, but the data values should be ignored.
};

const PointGhostTypes = {
  DUPLICATEPOINT: 1, // the cell is present on multiple processors
  HIDDENPOINT: 2, // the point is needed to maintain connectivity, but the data values should be ignored.
};

const AttributeCopyOperations = {
  COPYTUPLE: 0,
  INTERPOLATE: 1,
  PASSDATA: 2,
  ALLCOPY: 3, // all of the above
};

const ghostArrayName = 'vtkGhostType';

const DesiredOutputPrecision = {
  DEFAULT: 0, // use the point type that does not truncate any data
  SINGLE: 1, // use Float32Array
  DOUBLE: 2, // use Float64Array
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  AttributeCopyOperations,
  AttributeLimitTypes,
  AttributeTypes,
  CellGhostTypes,
  DesiredOutputPrecision,
  PointGhostTypes,
  ghostArrayName,
});


/***/ }),
/* 31 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(14);
/* harmony import */ var vtk_js_Sources_Common_Core_DataArray__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(28);
/* harmony import */ var vtk_js_Sources_Common_Core_DataArray_Constants__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(29);




const { vtkErrorMacro } = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default;

const INVALID_BOUNDS = [1, -1, 1, -1, 1, -1];

// ----------------------------------------------------------------------------
// vtkPoints methods
// ----------------------------------------------------------------------------

function vtkPoints(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkPoints');

  // Forwarding methods
  publicAPI.getNumberOfPoints = publicAPI.getNumberOfTuples;

  publicAPI.setNumberOfPoints = (nbPoints, dimension = 3) => {
    if (publicAPI.getNumberOfPoints() !== nbPoints) {
      model.size = nbPoints * dimension;
      model.values = new window[model.dataType](model.size);
      publicAPI.setNumberOfComponents(dimension);
      publicAPI.modified();
    }
  };

  publicAPI.setPoint = (idx, ...xyz) => {
    const offset = idx * model.numberOfComponents;
    for (let i = 0; i < model.numberOfComponents; i++) {
      model.values[offset + i] = xyz[i];
    }
  };

  publicAPI.getPoint = publicAPI.getTuple;

  publicAPI.getBounds = () => {
    if (publicAPI.getNumberOfComponents() === 3) {
      const xRange = publicAPI.getRange(0);
      model.bounds[0] = xRange[0];
      model.bounds[1] = xRange[1];
      const yRange = publicAPI.getRange(1);
      model.bounds[2] = yRange[0];
      model.bounds[3] = yRange[1];
      const zRange = publicAPI.getRange(2);
      model.bounds[4] = zRange[0];
      model.bounds[5] = zRange[1];
      return model.bounds;
    }

    if (publicAPI.getNumberOfComponents() !== 2) {
      vtkErrorMacro(`getBounds called on an array with components of
        ${publicAPI.getNumberOfComponents()}`);
      return INVALID_BOUNDS;
    }

    const xRange = publicAPI.getRange(0);
    model.bounds[0] = xRange[0];
    model.bounds[1] = xRange[1];
    const yRange = publicAPI.getRange(1);
    model.bounds[2] = yRange[0];
    model.bounds[3] = yRange[1];
    model.bounds[4] = 0;
    model.bounds[5] = 0;

    return model.bounds;
  };

  // Trigger the computation of bounds
  publicAPI.computeBounds = publicAPI.getBounds;

  // Initialize
  publicAPI.setNumberOfComponents(
    model.numberOfComponents < 2 ? 3 : model.numberOfComponents
  );
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  empty: true,
  numberOfComponents: 3,
  dataType: vtk_js_Sources_Common_Core_DataArray_Constants__WEBPACK_IMPORTED_MODULE_2__.VtkDataTypes.FLOAT,
  bounds: [1, -1, 1, -1, 1, -1],
};

// ----------------------------------------------------------------------------

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtk_js_Sources_Common_Core_DataArray__WEBPACK_IMPORTED_MODULE_1__.default.extend(publicAPI, model, initialValues);
  vtkPoints(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.newInstance(extend, 'vtkPoints');

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend });


/***/ }),
/* 32 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "CELL_FACTORY": () => (/* binding */ CELL_FACTORY),
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(14);
/* harmony import */ var vtk_js_Sources_vtk__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(15);
/* harmony import */ var vtk_js_Sources_Common_Core_CellArray__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(33);
/* harmony import */ var vtk_js_Sources_Common_DataModel_CellLinks__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(34);
/* harmony import */ var vtk_js_Sources_Common_DataModel_CellTypes__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(36);
/* harmony import */ var vtk_js_Sources_Common_DataModel_Line__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(38);
/* harmony import */ var vtk_js_Sources_Common_DataModel_PointSet__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(40);
/* harmony import */ var vtk_js_Sources_Common_DataModel_Triangle__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(45);
/* harmony import */ var vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(37);
/* harmony import */ var vtk_js_Sources_Common_DataModel_PolyData_Constants__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(46);












const { vtkWarningMacro } = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default;

const CELL_FACTORY = {
  [vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_LINE]: vtk_js_Sources_Common_DataModel_Line__WEBPACK_IMPORTED_MODULE_5__.default,
  [vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_POLY_LINE]: vtk_js_Sources_Common_DataModel_Line__WEBPACK_IMPORTED_MODULE_5__.default,
  [vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_TRIANGLE]: vtk_js_Sources_Common_DataModel_Triangle__WEBPACK_IMPORTED_MODULE_7__.default,
};

// ----------------------------------------------------------------------------
// vtkPolyData methods
// ----------------------------------------------------------------------------

function vtkPolyData(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkPolyData');

  function camelize(str) {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter) => letter.toUpperCase())
      .replace(/\s+/g, '');
  }

  // build empty cell arrays and set methods
  vtk_js_Sources_Common_DataModel_PolyData_Constants__WEBPACK_IMPORTED_MODULE_9__.POLYDATA_FIELDS.forEach((type) => {
    publicAPI[`getNumberOf${camelize(type)}`] = () =>
      model[type].getNumberOfCells();
    if (!model[type]) {
      model[type] = vtk_js_Sources_Common_Core_CellArray__WEBPACK_IMPORTED_MODULE_2__.default.newInstance();
    } else {
      model[type] = (0,vtk_js_Sources_vtk__WEBPACK_IMPORTED_MODULE_1__.default)(model[type]);
    }
  });

  publicAPI.getNumberOfCells = () =>
    vtk_js_Sources_Common_DataModel_PolyData_Constants__WEBPACK_IMPORTED_MODULE_9__.POLYDATA_FIELDS.reduce(
      (num, cellType) => num + model[cellType].getNumberOfCells(),
      0
    );

  const superShallowCopy = publicAPI.shallowCopy;
  publicAPI.shallowCopy = (other, debug = false) => {
    superShallowCopy(other, debug);
    vtk_js_Sources_Common_DataModel_PolyData_Constants__WEBPACK_IMPORTED_MODULE_9__.POLYDATA_FIELDS.forEach((type) => {
      model[type] = vtk_js_Sources_Common_Core_CellArray__WEBPACK_IMPORTED_MODULE_2__.default.newInstance();
      model[type].shallowCopy(other.getReferenceByName(type));
    });
  };

  publicAPI.buildCells = () => {
    // here are the number of cells we have
    const nVerts = publicAPI.getNumberOfVerts();
    const nLines = publicAPI.getNumberOfLines();
    const nPolys = publicAPI.getNumberOfPolys();
    const nStrips = publicAPI.getNumberOfStrips();

    // pre-allocate the space we need
    const nCells = nVerts + nLines + nPolys + nStrips;

    const types = new Uint8Array(nCells);
    let pTypes = types;
    const locs = new Uint32Array(nCells);
    let pLocs = locs;

    // record locations and type of each cell.
    // verts
    if (nVerts) {
      let nextCellPts = 0;
      model.verts.getCellSizes().forEach((numCellPts, index) => {
        pLocs[index] = nextCellPts;
        pTypes[index] =
          numCellPts > 1 ? vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_POLY_VERTEX : vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_VERTEX;
        nextCellPts += numCellPts + 1;
      });

      pLocs = pLocs.subarray(nVerts);
      pTypes = pTypes.subarray(nVerts);
    }

    // lines
    if (nLines) {
      let nextCellPts = 0;
      model.lines.getCellSizes().forEach((numCellPts, index) => {
        pLocs[index] = nextCellPts;
        pTypes[index] =
          numCellPts > 2 ? vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_POLY_LINE : vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_LINE;
        if (numCellPts === 1) {
          vtkWarningMacro(
            'Building VTK_LINE ',
            index,
            ' with only one point, but VTK_LINE needs at least two points. Check the input.'
          );
        }
        nextCellPts += numCellPts + 1;
      });

      pLocs = pLocs.subarray(nLines);
      pTypes = pTypes.subarray(nLines);
    }

    // polys
    if (nPolys) {
      let nextCellPts = 0;
      model.polys.getCellSizes().forEach((numCellPts, index) => {
        pLocs[index] = nextCellPts;
        switch (numCellPts) {
          case 3:
            pTypes[index] = vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_TRIANGLE;
            break;
          case 4:
            pTypes[index] = vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_QUAD;
            break;
          default:
            pTypes[index] = vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_POLYGON;
            break;
        }
        if (numCellPts < 3) {
          vtkWarningMacro(
            'Building VTK_TRIANGLE ',
            index,
            ' with less than three points, but VTK_TRIANGLE needs at least three points. Check the input.'
          );
        }
        nextCellPts += numCellPts + 1;
      });

      pLocs += pLocs.subarray(nPolys);
      pTypes += pTypes.subarray(nPolys);
    }

    // strips
    if (nStrips) {
      let nextCellPts = 0;
      pTypes.fill(vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_TRIANGLE_STRIP, 0, nStrips);

      model.strips.getCellSizes().forEach((numCellPts, index) => {
        pLocs[index] = nextCellPts;
        nextCellPts += numCellPts + 1;
      });
    }

    // set up the cell types data structure
    model.cells = vtk_js_Sources_Common_DataModel_CellTypes__WEBPACK_IMPORTED_MODULE_4__.default.newInstance();
    model.cells.setCellTypes(nCells, types, locs);
  };

  /**
   * Create upward links from points to cells that use each point. Enables
   * topologically complex queries.
   */
  publicAPI.buildLinks = (initialSize = 0) => {
    if (model.cells === undefined) {
      publicAPI.buildCells();
    }

    model.links = vtk_js_Sources_Common_DataModel_CellLinks__WEBPACK_IMPORTED_MODULE_3__.default.newInstance();
    if (initialSize > 0) {
      model.links.allocate(initialSize);
    } else {
      model.links.allocate(publicAPI.getPoints().getNumberOfPoints());
    }

    model.links.buildLinks(publicAPI);
  };

  // Returns an object made of the cellType and a subarray `cellPointIds` of
  // the cell points.
  publicAPI.getCellPoints = (cellId) => {
    const cellType = model.cells.getCellType(cellId);
    let cells = null;
    switch (cellType) {
      case vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_VERTEX:
      case vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_POLY_VERTEX:
        cells = model.verts;
        break;

      case vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_LINE:
      case vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_POLY_LINE:
        cells = model.lines;
        break;

      case vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_TRIANGLE:
      case vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_QUAD:
      case vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_POLYGON:
        cells = model.polys;
        break;

      case vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_8__.CellType.VTK_TRIANGLE_STRIP:
        cells = model.strips;
        break;

      default:
        cells = null;
        return { type: 0, cellPointIds: null };
    }
    const loc = model.cells.getCellLocation(cellId);
    const cellPointIds = cells.getCell(loc);
    return { cellType, cellPointIds };
  };

  publicAPI.getPointCells = (ptId) => model.links.getCells(ptId);

  publicAPI.getCellEdgeNeighbors = (cellId, point1, point2) => {
    const link1 = model.links.getLink(point1);
    const link2 = model.links.getLink(point2);

    return link1.cells.filter(
      (cell) => cell !== cellId && link2.cells.indexOf(cell) !== -1
    );
  };

  /**
   * If you know the type of cell, you may provide it to improve performances.
   */
  publicAPI.getCell = (cellId, cellHint = null) => {
    const cellInfo = publicAPI.getCellPoints(cellId);
    const cell = cellHint || CELL_FACTORY[cellInfo.cellType].newInstance();
    cell.initialize(publicAPI.getPoints(), cellInfo.cellPointIds);
    return cell;
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  // verts: null,
  // lines: null,
  // polys: null,
  // strips: null,
  // cells: null,
  // links: null,
};

// ----------------------------------------------------------------------------

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Inheritance
  vtk_js_Sources_Common_DataModel_PointSet__WEBPACK_IMPORTED_MODULE_6__.default.extend(publicAPI, model, initialValues);
  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.get(publicAPI, model, ['cells', 'links']);
  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.setGet(publicAPI, model, ['verts', 'lines', 'polys', 'strips']);

  // Object specific methods
  vtkPolyData(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.newInstance(extend, 'vtkPolyData');

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend });


/***/ }),
/* 33 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "STATIC": () => (/* binding */ STATIC),
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(14);
/* harmony import */ var vtk_js_Sources_Common_Core_DataArray__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(28);
/* harmony import */ var vtk_js_Sources_Common_Core_DataArray_Constants__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(29);




// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

function extractCellSizes(cellArray) {
  let currentIdx = 0;
  return cellArray.filter((value, index) => {
    if (index === currentIdx) {
      currentIdx += value + 1;
      return true;
    }
    return false;
  });
}

function getNumberOfCells(cellArray) {
  return extractCellSizes(cellArray).length;
}

// ----------------------------------------------------------------------------
// Static API
// ----------------------------------------------------------------------------

const STATIC = {
  extractCellSizes,
  getNumberOfCells,
};

// ----------------------------------------------------------------------------
// vtkCellArray methods
// ----------------------------------------------------------------------------

function vtkCellArray(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkCellArray');

  publicAPI.getNumberOfCells = (recompute) => {
    if (model.numberOfCells !== undefined && !recompute) {
      return model.numberOfCells;
    }

    model.cellSizes = extractCellSizes(model.values);
    model.numberOfCells = model.cellSizes.length;
    return model.numberOfCells;
  };

  publicAPI.getCellSizes = (recompute) => {
    if (model.cellSizes !== undefined && !recompute) {
      return model.cellSizes;
    }

    model.cellSizes = extractCellSizes(model.values);
    return model.cellSizes;
  };

  const superSetData = publicAPI.setData;
  publicAPI.setData = (typedArray) => {
    superSetData(typedArray, 1);
    model.numberOfCells = undefined;
    model.cellSizes = undefined;
  };

  /**
   * Returns the point indexes at the given location as a subarray.
   */
  publicAPI.getCell = (loc) => {
    let cellLoc = loc;
    const numberOfPoints = model.values[cellLoc++];
    return model.values.subarray(cellLoc, cellLoc + numberOfPoints);
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  empty: true,
  numberOfComponents: 1,
  dataType: vtk_js_Sources_Common_Core_DataArray_Constants__WEBPACK_IMPORTED_MODULE_2__.VtkDataTypes.UNSIGNED_INT,
};

// ----------------------------------------------------------------------------

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtk_js_Sources_Common_Core_DataArray__WEBPACK_IMPORTED_MODULE_1__.default.extend(publicAPI, model, initialValues);
  vtkCellArray(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.newInstance(extend, 'vtkCellArray');

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend, ...STATIC });


/***/ }),
/* 34 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "InitLink": () => (/* binding */ InitLink),
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(14);
/* harmony import */ var vtk_js_Sources_Common_DataModel_Cell__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(35);



// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------
const InitLink = {
  ncells: 0,
  cells: null,
};

function resize(model, sz) {
  let newSize = sz;
  if (sz >= model.array.length) {
    newSize += model.array.length;
  }

  while (newSize > model.array.length)
    model.array.push({
      ncells: 0,
      cells: null,
    });
  model.array.length = newSize;
}

// ----------------------------------------------------------------------------
// vtkCellLinks methods
// ----------------------------------------------------------------------------

function vtkCellLinks(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkCellLinks');

  /**
   * Build the link list array. All subclasses of vtkAbstractCellLinks
   * must support this method.
   */
  publicAPI.buildLinks = (data) => {
    const numPts = data.getPoints().getNumberOfPoints();
    const numCells = data.getNumberOfCells();

    // fill out lists with number of references to cells
    const linkLoc = new Uint32Array(numPts);

    // Use fast path if polydata
    if (data.isA('vtkPolyData')) {
      // traverse data to determine number of uses of each point
      for (let cellId = 0; cellId < numCells; ++cellId) {
        const { cellPointIds } = data.getCellPoints(cellId);
        cellPointIds.forEach((cellPointId) => {
          publicAPI.incrementLinkCount(cellPointId);
        });
      }

      // now allocate storage for the links
      publicAPI.allocateLinks(numPts);
      model.maxId = numPts - 1;

      for (let cellId = 0; cellId < numCells; ++cellId) {
        const { cellPointIds } = data.getCellPoints(cellId);
        cellPointIds.forEach((cellPointId) => {
          publicAPI.insertCellReference(
            cellPointId,
            linkLoc[cellPointId]++,
            cellId
          );
        });
      }
    } // any other type of dataset
    else {
      // traverse data to determine number of uses of each point
      for (let cellId = 0; cellId < numCells; cellId++) {
        // TODO: Currently not supported: const cell = data.getCell(cellId);
        const cell = vtk_js_Sources_Common_DataModel_Cell__WEBPACK_IMPORTED_MODULE_1__.default.newInstance();
        cell.getPointsIds().forEach((cellPointId) => {
          publicAPI.incrementLinkCount(cellPointId);
        });
      }

      // now allocate storage for the links
      publicAPI.allocateLinks(numPts);
      model.maxId = numPts - 1;

      for (let cellId = 0; cellId < numCells; ++cellId) {
        // TODO: Currently not supported: const cell = data.getCell(cellId);
        const cell = vtk_js_Sources_Common_DataModel_Cell__WEBPACK_IMPORTED_MODULE_1__.default.newInstance();
        cell.getPointsIds().forEach((cellPointId) => {
          publicAPI.insertCellReference(
            cellPointId,
            linkLoc[cellPointId]++,
            cellId
          );
        });
      }
    } // end else
  };

  /**
   * Build the link list array with a provided connectivity array.
   */
  // publicAPI.buildLinks = (data, connectivity) => {};

  /**
   * Allocate the specified number of links (i.e., number of points) that
   * will be built.
   */
  publicAPI.allocate = (numLinks, ext = 1000) => {
    model.array = Array(numLinks)
      .fill()
      .map(() => ({
        ncells: 0,
        cells: null,
      }));
    model.extend = ext;
    model.maxId = -1;
  };

  publicAPI.initialize = () => {
    model.array = null;
  };

  /**
   * Get a link structure given a point id.
   */
  publicAPI.getLink = (ptId) => model.array[ptId];

  /**
   * Get the number of cells using the point specified by ptId.
   */
  publicAPI.getNcells = (ptId) => model.array[ptId].ncells;

  /**
   * Return a list of cell ids using the point.
   */
  publicAPI.getCells = (ptId) => model.array[ptId].cells;

  /**
   * Insert a new point into the cell-links data structure. The size parameter
   * is the initial size of the list.
   */
  publicAPI.insertNextPoint = (numLinks) => {
    model.array.push({ ncells: numLinks, cells: Array(numLinks) });
    ++model.maxId;
  };

  /**
   * Insert a cell id into the list of cells (at the end) using the cell id
   * provided. (Make sure to extend the link list (if necessary) using the
   * method resizeCellList().)
   */
  publicAPI.insertNextCellReference = (ptId, cellId) => {
    model.array[ptId].cells[model.array[ptId].ncells++] = cellId;
  };

  /**
   * Delete point (and storage) by destroying links to using cells.
   */
  publicAPI.deletePoint = (ptId) => {
    model.array[ptId].ncells = 0;
    model.array[ptId].cells = null;
  };

  /**
   * Delete the reference to the cell (cellId) from the point (ptId). This
   * removes the reference to the cellId from the cell list, but does not
   * resize the list (recover memory with resizeCellList(), if necessary).
   */
  publicAPI.removeCellReference = (cellId, ptId) => {
    model.array[ptId].cells = model.array[ptId].cells.filter(
      (cell) => cell !== cellId
    );
    model.array[ptId].ncells = model.array[ptId].cells.length;
  };

  /**
   * Add the reference to the cell (cellId) from the point (ptId). This
   * adds a reference to the cellId from the cell list, but does not resize
   * the list (extend memory with resizeCellList(), if necessary).
   */
  publicAPI.addCellReference = (cellId, ptId) => {
    model.array[ptId].cells[model.array[ptId].ncells++] = cellId;
  };

  /**
   * Change the length of a point's link list (i.e., list of cells using a
   * point) by the size specified.
   */
  publicAPI.resizeCellList = (ptId, size) => {
    model.array[ptId].cells.length = size;
  };

  /**
   * Reclaim any unused memory.
   */
  publicAPI.squeeze = () => {
    resize(model, model.maxId + 1);
  };

  /**
   * Reset to a state of no entries without freeing the memory.
   */
  publicAPI.reset = () => {
    model.maxId = -1;
  };

  /**
   * Standard DeepCopy method.  Since this object contains no reference
   * to other objects, there is no ShallowCopy.
   */
  publicAPI.deepCopy = (src) => {
    model.array = [...src.array];
    model.extend = src.extend;
    model.maxId = src.maxId;
  };

  /**
   * Increment the count of the number of cells using the point.
   */
  publicAPI.incrementLinkCount = (ptId) => {
    ++model.array[ptId].ncells;
  };

  publicAPI.allocateLinks = (n) => {
    for (let i = 0; i < n; ++i) {
      model.array[i].cells = new Array(model.array[i].ncells);
    }
  };

  /**
   * Insert a cell id into the list of cells using the point.
   */
  publicAPI.insertCellReference = (ptId, pos, cellId) => {
    model.array[ptId].cells[pos] = cellId;
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  array: null, // pointer to data
  maxId: 0, // maximum index inserted thus far
  extend: 0, // grow array by this point
};

// ----------------------------------------------------------------------------

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.obj(publicAPI, model);

  vtkCellLinks(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.newInstance(extend, 'vtkCellLinks');

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend });


/***/ }),
/* 35 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(14);
/* harmony import */ var vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(17);
/* harmony import */ var vtk_js_Sources_Common_Core_Points__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(31);




// ----------------------------------------------------------------------------
// vtkCell methods
// ----------------------------------------------------------------------------

function vtkCell(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkCell');

  publicAPI.initialize = (points, pointIdsList = null) => {
    if (!pointIdsList) {
      model.points = points;
      model.pointsIds = new Array(points.getNumberOfPoints());
      for (let i = points.getNumberOfPoints() - 1; i >= 0; --i) {
        model.pointsIds[i] = i;
      }
    } else {
      model.pointsIds = pointIdsList;
      let triangleData = model.points.getData();
      if (triangleData.length !== 3 * model.pointsIds.length) {
        triangleData = new window[points.getDataType()](
          3 * model.pointsIds.length
        );
      }
      const pointsData = points.getData();
      model.pointsIds.forEach((pointId, index) => {
        // const start = 3 * pointId;
        // pointsData.set(p.subarray(start, start + 3), 3 * index);
        let pointOffset = 3 * pointId;
        let trianglePointOffset = 3 * index;
        triangleData[trianglePointOffset] = pointsData[pointOffset];
        triangleData[++trianglePointOffset] = pointsData[++pointOffset];
        triangleData[++trianglePointOffset] = pointsData[++pointOffset];
      });
      model.points.setData(triangleData);
    }
  };

  publicAPI.getBounds = () => {
    const nbPoints = model.points.getNumberOfPoints();
    const x = [];
    if (nbPoints) {
      model.points.getPoint(0, x);
      model.bounds[0] = x[0];
      model.bounds[1] = x[0];
      model.bounds[2] = x[1];
      model.bounds[3] = x[1];
      model.bounds[4] = x[2];
      model.bounds[5] = x[2];

      for (let i = 1; i < nbPoints; i++) {
        model.points.getPoint(i, x);
        model.bounds[0] = x[0] < model.bounds[0] ? x[0] : model.bounds[0];
        model.bounds[1] = x[0] > model.bounds[1] ? x[0] : model.bounds[1];
        model.bounds[2] = x[1] < model.bounds[2] ? x[1] : model.bounds[2];
        model.bounds[3] = x[1] > model.bounds[3] ? x[1] : model.bounds[3];
        model.bounds[4] = x[2] < model.bounds[4] ? x[2] : model.bounds[4];
        model.bounds[5] = x[2] > model.bounds[5] ? x[2] : model.bounds[5];
      }
    } else {
      vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_1__.uninitializeBounds(model.bounds);
    }
    return model.bounds;
  };

  publicAPI.getLength2 = () => {
    publicAPI.getBounds();
    let length = 0.0;
    let diff = 0;
    for (let i = 0; i < 3; i++) {
      diff = model.bounds[2 * i + 1] - model.bounds[2 * i];
      length += diff * diff;
    }
    return length;
  };

  publicAPI.getParametricDistance = (pcoords) => {
    let pDist;
    let pDistMax = 0.0;

    for (let i = 0; i < 3; i++) {
      if (pcoords[i] < 0.0) {
        pDist = -pcoords[i];
      } else if (pcoords[i] > 1.0) {
        pDist = pcoords[i] - 1.0;
      } else {
        // inside the cell in the parametric direction
        pDist = 0.0;
      }
      if (pDist > pDistMax) {
        pDistMax = pDist;
      }
    }
    return pDistMax;
  };

  publicAPI.getNumberOfPoints = () => model.points.getNumberOfPoints();

  publicAPI.deepCopy = (cell) => {
    cell.initialize(model.points, model.pointsIds);
  };

  publicAPI.getCellDimension = () => {}; // virtual
  publicAPI.intersectWithLine = (p1, p2, tol, t, x, pcoords, subId) => {}; // virtual
  publicAPI.evaluatePosition = (
    x,
    closestPoint,
    subId,
    pcoords,
    dist2,
    weights
  ) => {}; // virtual
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  bounds: [-1, -1, -1, -1, -1, -1],
  pointsIds: [],
};

// ----------------------------------------------------------------------------

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.obj(publicAPI, model);

  if (!model.points) {
    model.points = vtk_js_Sources_Common_Core_Points__WEBPACK_IMPORTED_MODULE_2__.default.newInstance();
  }

  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.get(publicAPI, model, ['points', 'pointsIds']);

  vtkCell(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.newInstance(extend, 'vtkCell');

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend });


/***/ }),
/* 36 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "STATIC": () => (/* binding */ STATIC),
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(14);
/* harmony import */ var vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(37);



// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

/**
 * Given an int (as defined in vtkCellType.h) identifier for a class
 * return it's classname.
 */
function getClassNameFromTypeId(typeId) {
  return typeId < vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_1__.CellTypesStrings.length
    ? vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_1__.CellTypesStrings[typeId]
    : 'UnknownClass';
}

/**
 * Given a data object classname, return it's int identified (as
 * defined in vtkCellType.h)
 */
function getTypeIdFromClassName(cellTypeString) {
  return vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_1__.CellTypesStrings.findIndex(cellTypeString);
}

/**
 * This convenience method is a fast check to determine if a cell type
 * represents a linear or nonlinear cell.  This is generally much more
 * efficient than getting the appropriate vtkCell and checking its IsLinear
 * method.
 */
function isLinear(type) {
  return (
    type < vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_1__.CellType.VTK_QUADRATIC_EDGE ||
    type === vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_1__.CellType.VTK_CONVEX_POINT_SET ||
    type === vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_1__.CellType.VTK_POLYHEDRON
  );
}

// ----------------------------------------------------------------------------
// Static API
// ----------------------------------------------------------------------------

const STATIC = {
  getClassNameFromTypeId,
  getTypeIdFromClassName,
  isLinear,
};

// ----------------------------------------------------------------------------
// vtkCellTypes methods
// ----------------------------------------------------------------------------

function vtkCellTypes(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkCellTypes');

  /**
   * Allocate memory for this array. Delete old storage only if necessary.
   */
  publicAPI.allocate = (sz = 512, ext = 1000) => {
    model.size = sz > 0 ? sz : 1;
    model.extend = ext > 0 ? ext : 1;
    model.maxId = -1;
    model.typeArray = new Uint8Array(sz);
    model.locationArray = new Uint32Array(sz);
  };

  /**
   * Add a cell at specified id.
   */
  publicAPI.insertCell = (cellId, type, loc) => {
    model.typeArray[cellId] = type;
    model.locationArray[cellId] = loc;

    if (cellId > model.maxId) {
      model.maxId = cellId;
    }
  };

  /**
   * Add a cell to the object in the next available slot.
   */
  publicAPI.insertNextCell = (type, loc) => {
    publicAPI.insertCell(++model.maxId, type, loc);
    return model.maxId;
  };

  /**
   * Specify a group of cell types. This version is provided to maintain
   * backwards compatibility and does a copy of the cellLocations
   */
  publicAPI.setCellTypes = (ncells, cellTypes, cellLocations) => {
    model.size = ncells;

    model.typeArray = cellTypes;
    model.locationArray = cellLocations;

    model.maxId = ncells - 1;
  };

  /**
   * Return the location of the cell in the associated vtkCellArray.
   */
  publicAPI.getCellLocation = (cellId) => model.locationArray[cellId];

  /**
   * Delete cell by setting to nullptr cell type.
   */
  publicAPI.deleteCell = (cellId) => {
    model.typeArray[cellId] = vtk_js_Sources_Common_DataModel_CellTypes_Constants__WEBPACK_IMPORTED_MODULE_1__.CellType.VTK_EMPTY_CELL;
  };

  /**
   * Return the number of types in the list.
   */
  publicAPI.getNumberOfTypes = () => model.maxId + 1;

  /**
   * Return true if type specified is contained in list; false otherwise.
   */
  publicAPI.isType = (type) => {
    const numTypes = publicAPI.getNumberOfTypes();

    for (let i = 0; i < numTypes; ++i) {
      if (type === publicAPI.getCellType(i)) {
        return true;
      }
    }
    return false;
  };

  /**
   * Add the type specified to the end of the list. Range checking is performed.
   */
  publicAPI.insertNextType = (type) => publicAPI.insertNextCell(type, -1);

  /**
   * Return the type of cell.
   */
  publicAPI.getCellType = (cellId) => model.typeArray[cellId];

  /**
   * Reclaim any extra memory.
   */
  // TODO: publicAPI.squeeze = () =>  {};

  /**
   * Initialize object without releasing memory.
   */
  publicAPI.reset = () => {
    model.maxId = -1;
  };

  /**
   * Standard DeepCopy method.  Since this object contains no reference
   * to other objects, there is no ShallowCopy.
   */
  publicAPI.deepCopy = (src) => {
    publicAPI.allocate(src.getSize(), src.getExtend());
    model.typeArray.set(src.getTypeArray());
    model.locationArray.set(src.getLocationArray());
    model.maxId = src.getMaxId();
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  // typeArray: null, // pointer to types array
  // locationArray: null;   // pointer to array of offsets
  size: 0, // allocated size of data
  maxId: -1, // maximum index inserted thus far
  extend: 1000, // grow array by this point
};

// ----------------------------------------------------------------------------

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.obj(publicAPI, model);

  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.get(publicAPI, model, ['size', 'maxId', 'extend']);
  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.getArray(publicAPI, model, ['typeArray', 'locationArray']);

  vtkCellTypes(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.newInstance(extend, 'vtkCellTypes');

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend, ...STATIC });


/***/ }),
/* 37 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "CellType": () => (/* binding */ CellType),
/* harmony export */   "CellTypesStrings": () => (/* binding */ CellTypesStrings),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const CellType = {
  // Linear cells
  VTK_EMPTY_CELL: 0,
  VTK_VERTEX: 1,
  VTK_POLY_VERTEX: 2,
  VTK_LINE: 3,
  VTK_POLY_LINE: 4,
  VTK_TRIANGLE: 5,
  VTK_TRIANGLE_STRIP: 6,
  VTK_POLYGON: 7,
  VTK_PIXEL: 8,
  VTK_QUAD: 9,
  VTK_TETRA: 10,
  VTK_VOXEL: 11,
  VTK_HEXAHEDRON: 12,
  VTK_WEDGE: 13,
  VTK_PYRAMID: 14,
  VTK_PENTAGONAL_PRISM: 15,
  VTK_HEXAGONAL_PRISM: 16,

  // Quadratic, isoparametric cells
  VTK_QUADRATIC_EDGE: 21,
  VTK_QUADRATIC_TRIANGLE: 22,
  VTK_QUADRATIC_QUAD: 23,
  VTK_QUADRATIC_POLYGON: 36,
  VTK_QUADRATIC_TETRA: 24,
  VTK_QUADRATIC_HEXAHEDRON: 25,
  VTK_QUADRATIC_WEDGE: 26,
  VTK_QUADRATIC_PYRAMID: 27,
  VTK_BIQUADRATIC_QUAD: 28,
  VTK_TRIQUADRATIC_HEXAHEDRON: 29,
  VTK_QUADRATIC_LINEAR_QUAD: 30,
  VTK_QUADRATIC_LINEAR_WEDGE: 31,
  VTK_BIQUADRATIC_QUADRATIC_WEDGE: 32,
  VTK_BIQUADRATIC_QUADRATIC_HEXAHEDRON: 33,
  VTK_BIQUADRATIC_TRIANGLE: 34,

  // Cubic, isoparametric cell
  VTK_CUBIC_LINE: 35,

  // Special class of cells formed by convex group of points
  VTK_CONVEX_POINT_SET: 41,

  // Polyhedron cell (consisting of polygonal faces)
  VTK_POLYHEDRON: 42,

  // Higher order cells in parametric form
  VTK_PARAMETRIC_CURVE: 51,
  VTK_PARAMETRIC_SURFACE: 52,
  VTK_PARAMETRIC_TRI_SURFACE: 53,
  VTK_PARAMETRIC_QUAD_SURFACE: 54,
  VTK_PARAMETRIC_TETRA_REGION: 55,
  VTK_PARAMETRIC_HEX_REGION: 56,

  // Higher order cells
  VTK_HIGHER_ORDER_EDGE: 60,
  VTK_HIGHER_ORDER_TRIANGLE: 61,
  VTK_HIGHER_ORDER_QUAD: 62,
  VTK_HIGHER_ORDER_POLYGON: 63,
  VTK_HIGHER_ORDER_TETRAHEDRON: 64,
  VTK_HIGHER_ORDER_WEDGE: 65,
  VTK_HIGHER_ORDER_PYRAMID: 66,
  VTK_HIGHER_ORDER_HEXAHEDRON: 67,

  // Arbitrary order Lagrange elements (formulated separated from generic higher order cells)
  VTK_LAGRANGE_CURVE: 68,
  VTK_LAGRANGE_TRIANGLE: 69,
  VTK_LAGRANGE_QUADRILATERAL: 70,
  VTK_LAGRANGE_TETRAHEDRON: 71,
  VTK_LAGRANGE_HEXAHEDRON: 72,
  VTK_LAGRANGE_WEDGE: 73,
  VTK_LAGRANGE_PYRAMID: 74,

  VTK_NUMBER_OF_CELL_TYPES: 75,
};

// This list should contain the cell class names in
// the same order as in CellType.
const CellTypesStrings = [
  'vtkEmptyCell',
  'vtkVertex',
  'vtkPolyVertex',
  'vtkLine',
  'vtkPolyLine',
  'vtkTriangle',
  'vtkTriangleStrip',
  'vtkPolygon',
  'vtkPixel',
  'vtkQuad',
  'vtkTetra',
  'vtkVoxel',
  'vtkHexahedron',
  'vtkWedge',
  'vtkPyramid',
  'vtkPentagonalPrism',
  'vtkHexagonalPrism',
  'UnknownClass',
  'UnknownClass',
  'UnknownClass',
  'UnknownClass',
  'vtkQuadraticEdge',
  'vtkQuadraticTriangle',
  'vtkQuadraticQuad',
  'vtkQuadraticTetra',
  'vtkQuadraticHexahedron',
  'vtkQuadraticWedge',
  'vtkQuadraticPyramid',
  'vtkBiQuadraticQuad',
  'vtkTriQuadraticHexahedron',
  'vtkQuadraticLinearQuad',
  'vtkQuadraticLinearWedge',
  'vtkBiQuadraticQuadraticWedge',
  'vtkBiQuadraticQuadraticHexahedron',
  'vtkBiQuadraticTriangle',
  'vtkCubicLine',
  'vtkQuadraticPolygon',
  'UnknownClass',
  'UnknownClass',
  'UnknownClass',
  'UnknownClass',
  'vtkConvexPointSet',
  'UnknownClass',
  'UnknownClass',
  'UnknownClass',
  'UnknownClass',
  'UnknownClass',
  'UnknownClass',
  'UnknownClass',
  'UnknownClass',
  'UnknownClass',
  'vtkParametricCurve',
  'vtkParametricSurface',
  'vtkParametricTriSurface',
  'vtkParametricQuadSurface',
  'vtkParametricTetraRegion',
  'vtkParametricHexRegion',
  'UnknownClass',
  'UnknownClass',
  'UnknownClass',
  'vtkHigherOrderEdge',
  'vtkHigherOrderTriangle',
  'vtkHigherOrderQuad',
  'vtkHigherOrderPolygon',
  'vtkHigherOrderTetrahedron',
  'vtkHigherOrderWedge',
  'vtkHigherOrderPyramid',
  'vtkHigherOrderHexahedron',
];

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  CellType,
  CellTypesStrings,
});


/***/ }),
/* 38 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "STATIC": () => (/* binding */ STATIC),
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(14);
/* harmony import */ var vtk_js_Sources_Common_DataModel_Line_Constants__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(39);
/* harmony import */ var vtk_js_Sources_Common_DataModel_Cell__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(35);
/* harmony import */ var vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(17);





const { IntersectionState } = vtk_js_Sources_Common_DataModel_Line_Constants__WEBPACK_IMPORTED_MODULE_1__.default;

// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------
function distanceToLine(x, p1, p2, closestPoint = null) {
  const outObj = { t: Number.MIN_VALUE, distance: 0 };
  const p21 = [];
  let closest;
  // Determine appropriate vector
  p21[0] = p2[0] - p1[0];
  p21[1] = p2[1] - p1[1];
  p21[2] = p2[2] - p1[2];

  // Get parametric location
  const num =
    p21[0] * (x[0] - p1[0]) + p21[1] * (x[1] - p1[1]) + p21[2] * (x[2] - p1[2]);
  const denom = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_3__.dot(p21, p21);

  // trying to avoid an expensive fabs
  let tolerance = 1e-5 * num;
  if (denom !== 0.0) {
    outObj.t = num / denom;
  }
  if (tolerance < 0.0) {
    tolerance = -tolerance;
  }
  if (-tolerance < denom && denom < tolerance) {
    closest = p1;
  } else if (denom <= 0.0 || outObj.t < 0.0) {
    // If parametric coordinate is within 0<=p<=1, then the point is closest to
    // the line.  Otherwise, it's closest to a point at the end of the line.
    closest = p1;
  } else if (outObj.t > 1.0) {
    closest = p2;
  } else {
    closest = p21;
    p21[0] = p1[0] + outObj.t * p21[0];
    p21[1] = p1[1] + outObj.t * p21[1];
    p21[2] = p1[2] + outObj.t * p21[2];
  }

  if (closestPoint) {
    closestPoint[0] = closest[0];
    closestPoint[1] = closest[1];
    closestPoint[2] = closest[2];
  }
  outObj.distance = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_3__.distance2BetweenPoints(closest, x);
  return outObj;
}

function intersection(a1, a2, b1, b2, u, v) {
  const a21 = [];
  const b21 = [];
  const b1a1 = [];

  u[0] = 0.0;
  v[0] = 0.0;

  // Determine line vectors.
  a21[0] = a2[0] - a1[0];
  a21[1] = a2[1] - a1[1];
  a21[2] = a2[2] - a1[2];
  b21[0] = b2[0] - b1[0];
  b21[1] = b2[1] - b1[1];
  b21[2] = b2[2] - b1[2];
  b1a1[0] = b1[0] - a1[0];
  b1a1[1] = b1[1] - a1[1];
  b1a1[2] = b1[2] - a1[2];

  // Compute the system (least squares) matrix.
  const A = [];
  A[0] = [vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_3__.dot(a21, a21), -vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_3__.dot(a21, b21)];
  A[1] = [A[0][1], vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_3__.dot(b21, b21)];

  // Compute the least squares system constant term.
  const c = [];
  c[0] = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_3__.dot(a21, b1a1);
  c[1] = -vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_3__.dot(b21, b1a1);

  // Solve the system of equations
  if (vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_3__.solveLinearSystem(A, c, 2) === 0) {
    // The lines are colinear. Therefore, one of the four endpoints is the
    // point of closest approach
    let minDist = Number.MAX_VALUE;
    const p = [a1, a2, b1, b2];
    const l1 = [b1, b1, a1, a1];
    const l2 = [b2, b2, a2, a2];
    const uv1 = [v[0], v[0], u[0], u[0]];
    const uv2 = [u[0], u[0], v[0], v[0]];
    let obj;
    for (let i = 0; i < 4; i++) {
      obj = distanceToLine(p[i], l1[i], l2[i]);
      if (obj.distance < minDist) {
        minDist = obj.distance;
        uv1[i] = obj.t;
        uv2[i] = i % 2;
      }
    }
    return IntersectionState.ON_LINE;
  }
  u[0] = c[0];
  v[0] = c[1];

  // Check parametric coordinates for intersection.
  if (u[0] >= 0.0 && u[0] <= 1.0 && v[0] >= 0.0 && v[0] <= 1.0) {
    return IntersectionState.YES_INTERSECTION;
  }

  return IntersectionState.NO_INTERSECTION;
}

// ----------------------------------------------------------------------------
// Static API
// ----------------------------------------------------------------------------

const STATIC = {
  distanceToLine,
  intersection,
};

// ----------------------------------------------------------------------------
// vtkLine methods
// ----------------------------------------------------------------------------

function vtkLine(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkLine');

  publicAPI.getCellDimension = () => 1;
  publicAPI.intersectWithLine = (p1, p2, tol, x, pcoords) => {
    const outObj = { intersect: 0, t: Number.MIN_VALUE, subId: 0 };
    pcoords[1] = 0.0;
    pcoords[2] = 0.0;
    const projXYZ = [];

    const a1 = [];
    const a2 = [];
    model.points.getPoint(0, a1);
    model.points.getPoint(1, a2);

    const u = [];
    const v = [];
    const intersect = intersection(p1, p2, a1, a2, u, v);
    outObj.t = u[0];
    pcoords[0] = v[0];

    if (intersect === IntersectionState.YES_INTERSECTION) {
      // make sure we are within tolerance
      for (let i = 0; i < 3; i++) {
        x[i] = a1[i] + pcoords[0] * (a2[i] - a1[i]);
        projXYZ[i] = p1[i] + outObj.t * (p2[i] - p1[i]);
      }
      if (vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_3__.distance2BetweenPoints(x, projXYZ) <= tol * tol) {
        outObj.intersect = 1;
        return outObj;
      }
    } else {
      let outDistance;
      // check to see if it lies within tolerance
      // one of the parametric coords must be outside 0-1
      if (outObj.t < 0.0) {
        outObj.t = 0.0;
        outDistance = distanceToLine(p1, a1, a2, x);
        pcoords[0] = outDistance.t;
        if (outDistance.distance <= tol * tol) {
          outObj.intersect = 1;
          return outObj;
        }
        return outObj;
      }
      if (outObj.t > 1.0) {
        outObj.t = 1.0;
        outDistance = distanceToLine(p2, a1, a2, x);
        pcoords[0] = outDistance.t;
        if (outDistance.distance <= tol * tol) {
          outObj.intersect = 1;
          return outObj;
        }
        return outObj;
      }
      if (pcoords[0] < 0.0) {
        pcoords[0] = 0.0;
        outDistance = distanceToLine(a1, p1, p2, x);
        outObj.t = outDistance.t;
        if (outDistance.distance <= tol * tol) {
          outObj.intersect = 1;
          return outObj;
        }
        return outObj;
      }
      if (pcoords[1] > 1.0) {
        pcoords[1] = 1.0;
        outDistance = distanceToLine(a2, p1, p2, x);
        outObj.t = outDistance.t;
        if (outDistance.distance <= tol * tol) {
          outObj.intersect = 1;
          return outObj;
        }
        return outObj;
      }
    }
    return outObj;
  };
  publicAPI.evaluatePosition = (
    x,
    closestPoint,
    subId,
    pcoords,
    dist2,
    weights
  ) => {}; // virtual
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {};

// ----------------------------------------------------------------------------

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtk_js_Sources_Common_DataModel_Cell__WEBPACK_IMPORTED_MODULE_2__.default.extend(publicAPI, model, initialValues);

  vtkLine(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.newInstance(extend, 'vtkLine');

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend, ...STATIC, ...vtk_js_Sources_Common_DataModel_Line_Constants__WEBPACK_IMPORTED_MODULE_1__.default });


/***/ }),
/* 39 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "IntersectionState": () => (/* binding */ IntersectionState),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const IntersectionState = {
  NO_INTERSECTION: 0,
  YES_INTERSECTION: 1,
  ON_LINE: 2,
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  IntersectionState,
});


/***/ }),
/* 40 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_vtk__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(15);
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(14);
/* harmony import */ var vtk_js_Sources_Common_DataModel_DataSet__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(41);
/* harmony import */ var vtk_js_Sources_Common_Core_Points__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(31);





// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// vtkPointSet methods
// ----------------------------------------------------------------------------

function vtkPointSet(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkPointSet');

  // Create empty points
  if (!model.points) {
    model.points = vtk_js_Sources_Common_Core_Points__WEBPACK_IMPORTED_MODULE_3__.default.newInstance();
  } else {
    model.points = (0,vtk_js_Sources_vtk__WEBPACK_IMPORTED_MODULE_0__.default)(model.points);
  }

  publicAPI.getNumberOfPoints = () => model.points.getNumberOfPoints();

  publicAPI.getBounds = () => model.points.getBounds();

  publicAPI.computeBounds = () => {
    publicAPI.getBounds();
  };

  const superShallowCopy = publicAPI.shallowCopy;
  publicAPI.shallowCopy = (other, debug = false) => {
    superShallowCopy(other, debug);
    model.points = vtk_js_Sources_Common_Core_Points__WEBPACK_IMPORTED_MODULE_3__.default.newInstance();
    model.points.shallowCopy(other.getPoints());
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  // points: null,
};

// ----------------------------------------------------------------------------

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Inheritance
  vtk_js_Sources_Common_DataModel_DataSet__WEBPACK_IMPORTED_MODULE_2__.default.extend(publicAPI, model, initialValues);
  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__.default.setGet(publicAPI, model, ['points']);

  // Object specific methods
  vtkPointSet(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__.default.newInstance(extend, 'vtkPointSet');

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend });


/***/ }),
/* 41 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(14);
/* harmony import */ var vtk_js_Sources_vtk__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(15);
/* harmony import */ var vtk_js_Sources_Common_DataModel_DataSetAttributes__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(42);
/* harmony import */ var vtk_js_Sources_Common_DataModel_DataSet_Constants__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(44);





// import vtkBoundingBox from '../BoundingBox';
// import * as vtkMath from '../../Core/Math';
//
// function getBounds(dataset) {
//   if (dataset.bounds) {
//     return dataset.bounds;
//   }
//   if (dataset.type && dataset[dataset.type]) {
//     const ds = dataset[dataset.type];
//     if (ds.bounds) {
//       return ds.bounds;
//     }
//     if (ds.Points && ds.Points.bounds) {
//       return ds.Points.bounds;
//     }

//     if (ds.Points && ds.Points.values) {
//       const array = ds.Points.values;
//       const bbox = vtkBoundingBox.newInstance();
//       const size = array.length;
//       const delta = ds.Points.numberOfComponents ? ds.Points.numberOfComponents : 3;
//       for (let idx = 0; idx < size; idx += delta) {
//         bbox.addPoint(array[idx * delta], array[(idx * delta) + 1], array[(idx * delta) + 2]);
//       }
//       ds.Points.bounds = bbox.getBounds();
//       return ds.Points.bounds;
//     }
//   }
//   return vtkMath.createUninitializedBounds();
// }

// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

const DATASET_FIELDS = ['pointData', 'cellData', 'fieldData'];

// ----------------------------------------------------------------------------
// vtkDataSet methods
// ----------------------------------------------------------------------------

function vtkDataSet(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkDataSet');

  // Add dataset attributes
  DATASET_FIELDS.forEach((fieldName) => {
    if (!model[fieldName]) {
      model[fieldName] = vtk_js_Sources_Common_DataModel_DataSetAttributes__WEBPACK_IMPORTED_MODULE_2__.default.newInstance();
    } else {
      model[fieldName] = (0,vtk_js_Sources_vtk__WEBPACK_IMPORTED_MODULE_1__.default)(model[fieldName]);
    }
  });

  const superShallowCopy = publicAPI.shallowCopy;
  publicAPI.shallowCopy = (other, debug = false) => {
    superShallowCopy(other, debug);
    DATASET_FIELDS.forEach((fieldName) => {
      model[fieldName] = vtk_js_Sources_Common_DataModel_DataSetAttributes__WEBPACK_IMPORTED_MODULE_2__.default.newInstance();
      model[fieldName].shallowCopy(other.getReferenceByName(fieldName));
    });
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  // pointData: null,
  // cellData: null,
  // fieldData: null,
};

// ----------------------------------------------------------------------------

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Object methods
  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.obj(publicAPI, model);
  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.setGet(publicAPI, model, DATASET_FIELDS);

  // Object specific methods
  vtkDataSet(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.newInstance(extend, 'vtkDataSet');

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend, ...vtk_js_Sources_Common_DataModel_DataSet_Constants__WEBPACK_IMPORTED_MODULE_3__.default });


/***/ }),
/* 42 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(14);
/* harmony import */ var vtk_js_Sources_Common_DataModel_DataSetAttributes_FieldData__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(43);
/* harmony import */ var vtk_js_Sources_Common_DataModel_DataSetAttributes_Constants__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(30);
/* harmony import */ var vtk_js_Sources_Common_Core_DataArray__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(28);





const { AttributeTypes, AttributeCopyOperations } = vtk_js_Sources_Common_DataModel_DataSetAttributes_Constants__WEBPACK_IMPORTED_MODULE_2__.default;
const { vtkWarningMacro } = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default;

// ----------------------------------------------------------------------------
// vtkDataSetAttributes methods
// ----------------------------------------------------------------------------

function vtkDataSetAttributes(publicAPI, model) {
  const attrTypes = [
    'Scalars',
    'Vectors',
    'Normals',
    'TCoords',
    'Tensors',
    'GlobalIds',
    'PedigreeIds',
  ];

  function cleanAttributeType(attType) {
    // Given an integer or string, convert the result to one of the
    // strings in the "attrTypes" array above or null (if
    // no match is found)
    let cleanAttType = attrTypes.find(
      (ee) =>
        AttributeTypes[ee.toUpperCase()] === attType ||
        (typeof attType !== 'number' &&
          ee.toLowerCase() === attType.toLowerCase())
    );
    if (typeof cleanAttType === 'undefined') {
      cleanAttType = null;
    }
    return cleanAttType;
  }

  // Set our className
  model.classHierarchy.push('vtkDataSetAttributes');

  publicAPI.checkNumberOfComponents = (x) => true; // TODO

  publicAPI.setAttribute = (arr, uncleanAttType) => {
    const attType = cleanAttributeType(uncleanAttType);
    if (
      arr &&
      attType.toUpperCase() === 'PEDIGREEIDS' &&
      !arr.isA('vtkDataArray')
    ) {
      vtkWarningMacro(
        `Cannot set attribute ${attType}. The attribute must be a vtkDataArray.`
      );
      return -1;
    }
    if (arr && !publicAPI.checkNumberOfComponents(arr, attType)) {
      vtkWarningMacro(
        `Cannot set attribute ${attType}. Incorrect number of components.`
      );
      return -1;
    }
    let currentAttribute = model[`active${attType}`];
    if (currentAttribute >= 0 && currentAttribute < model.arrays.length) {
      if (model.arrays[currentAttribute] === arr) {
        return currentAttribute;
      }
      publicAPI.removeArrayByIndex(currentAttribute);
    }

    if (arr) {
      currentAttribute = publicAPI.addArray(arr);
      model[`active${attType}`] = currentAttribute;
    } else {
      model[`active${attType}`] = -1;
    }
    publicAPI.modified();
    return model[`active${attType}`];
  };

  publicAPI.setActiveAttributeByName = (arrayName, attType) =>
    publicAPI.setActiveAttributeByIndex(
      publicAPI.getArrayWithIndex(arrayName).index,
      attType
    );

  publicAPI.setActiveAttributeByIndex = (arrayIdx, uncleanAttType) => {
    const attType = cleanAttributeType(uncleanAttType);
    if (arrayIdx >= 0 && arrayIdx < model.arrays.length) {
      if (attType.toUpperCase() !== 'PEDIGREEIDS') {
        const arr = publicAPI.getArrayByIndex(arrayIdx);
        if (!arr.isA('vtkDataArray')) {
          vtkWarningMacro(
            `Cannot set attribute ${attType}. Only vtkDataArray subclasses can be set as active attributes.`
          );
          return -1;
        }
        if (!publicAPI.checkNumberOfComponents(arr, attType)) {
          vtkWarningMacro(
            `Cannot set attribute ${attType}. Incorrect number of components.`
          );
          return -1;
        }
      }
      model[`active${attType}`] = arrayIdx;
      publicAPI.modified();
      return arrayIdx;
    }

    if (arrayIdx === -1) {
      model[`active${attType}`] = arrayIdx;
      publicAPI.modified();
    }

    return -1;
  };

  publicAPI.getActiveAttribute = (attType) => {
    // Given an integer enum value or a string (with random capitalization),
    // find the matching string in attrTypes.
    const cleanAttType = cleanAttributeType(attType);
    return publicAPI[`get${cleanAttType}`]();
  };

  // Override to allow proper handling of active attributes
  publicAPI.removeAllArrays = () => {
    model.arrays = [];
    attrTypes.forEach((attType) => {
      model[`active${attType}`] = -1;
    });
  };

  // Override to allow proper handling of active attributes
  publicAPI.removeArray = (arrayName) => {
    model.arrays = model.arrays.filter((entry, idx) => {
      if (arrayName === entry.data.getName()) {
        // Found the array to remove, but is it an active attribute?
        attrTypes.forEach((attType) => {
          if (idx === model[`active${attType}`]) {
            model[`active${attType}`] = -1;
          }
        });
        return false;
      }
      return true;
    });
  };

  // Override to allow proper handling of active attributes
  publicAPI.removeArrayByIndex = (arrayIdx) => {
    model.arrays = model.arrays.filter((entry, idx) => idx !== arrayIdx);
    attrTypes.forEach((attType) => {
      if (arrayIdx === model[`active${attType}`]) {
        model[`active${attType}`] = -1;
      }
    });
  };

  attrTypes.forEach((value) => {
    const activeVal = `active${value}`;
    publicAPI[`get${value}`] = () =>
      publicAPI.getArrayByIndex(model[activeVal]);
    publicAPI[`set${value}`] = (da) => publicAPI.setAttribute(da, value);
    publicAPI[`setActive${value}`] = (arrayName) =>
      publicAPI.setActiveAttributeByIndex(
        publicAPI.getArrayWithIndex(arrayName).index,
        value
      );
    publicAPI[`copy${value}Off`] = () => {
      const attType = value.toUpperCase();
      model.copyAttributeFlags[AttributeCopyOperations.PASSDATA][
        AttributeTypes[attType]
      ] = false;
    };
  });

  publicAPI.initializeAttributeCopyFlags = () => {
    // Default to copying all attributes in every circumstance:
    model.copyAttributeFlags = [];
    Object.keys(AttributeCopyOperations)
      .filter((op) => op !== 'ALLCOPY')
      .forEach((attCopyOp) => {
        model.copyAttributeFlags[
          AttributeCopyOperations[attCopyOp]
        ] = Object.keys(AttributeTypes)
          .filter((ty) => ty !== 'NUM_ATTRIBUTES')
          .reduce((a, b) => {
            a[AttributeTypes[b]] = true;
            return a;
          }, []);
      });
    // Override some operations where we don't want to copy:
    model.copyAttributeFlags[AttributeCopyOperations.COPYTUPLE][
      AttributeTypes.GLOBALIDS
    ] = false;
    model.copyAttributeFlags[AttributeCopyOperations.INTERPOLATE][
      AttributeTypes.GLOBALIDS
    ] = false;
    model.copyAttributeFlags[AttributeCopyOperations.COPYTUPLE][
      AttributeTypes.PEDIGREEIDS
    ] = false;
  };

  publicAPI.initialize = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.chain(
    publicAPI.initialize,
    publicAPI.initializeAttributeCopyFlags
  );

  // Process dataArrays if any
  if (model.dataArrays && Object.keys(model.dataArrays).length) {
    Object.keys(model.dataArrays).forEach((name) => {
      if (
        !model.dataArrays[name].ref &&
        model.dataArrays[name].type === 'vtkDataArray'
      ) {
        publicAPI.addArray(vtk_js_Sources_Common_Core_DataArray__WEBPACK_IMPORTED_MODULE_3__.default.newInstance(model.dataArrays[name]));
      }
    });
  }

  const superShallowCopy = publicAPI.shallowCopy;
  publicAPI.shallowCopy = (other, debug) => {
    superShallowCopy(other, debug);
    model.arrays = other.getArrays().map((arr) => {
      const arrNew = arr.newClone();
      arrNew.shallowCopy(arr, debug);
      return { data: arrNew };
    });
  };

  publicAPI.initializeAttributeCopyFlags();
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  activeScalars: -1,
  activeVectors: -1,
  activeTensors: -1,
  activeNormals: -1,
  activeTCoords: -1,
  activeGlobalIds: -1,
  activePedigreeIds: -1,
};

// ----------------------------------------------------------------------------

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Object methods
  vtk_js_Sources_Common_DataModel_DataSetAttributes_FieldData__WEBPACK_IMPORTED_MODULE_1__.default.extend(publicAPI, model, initialValues);
  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.setGet(publicAPI, model, [
    'activeScalars',
    'activeNormals',
    'activeTCoords',
    'activeVectors',
    'activeTensors',
    'activeGlobalIds',
    'activePedigreeIds',
  ]);

  if (!model.arrays) {
    model.arrays = {};
  }

  // Object specific methods
  vtkDataSetAttributes(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.newInstance(extend, 'vtkDataSetAttributes');

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend, ...vtk_js_Sources_Common_DataModel_DataSetAttributes_Constants__WEBPACK_IMPORTED_MODULE_2__.default });


/***/ }),
/* 43 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_vtk__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(15);
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(14);
/* harmony import */ var vtk_js_Sources_Common_Core_DataArray__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(28);




// ----------------------------------------------------------------------------
// vtkFieldData methods
// ----------------------------------------------------------------------------

function vtkFieldData(publicAPI, model) {
  model.classHierarchy.push('vtkFieldData');
  const superGetState = publicAPI.getState;

  // Decode serialized data if any
  if (model.arrays) {
    model.arrays = model.arrays.map((item) => ({ data: (0,vtk_js_Sources_vtk__WEBPACK_IMPORTED_MODULE_0__.default)(item.data) }));
  }

  publicAPI.initialize = () => {
    publicAPI.initializeFields();
    publicAPI.copyAllOn();
    publicAPI.clearFieldFlags();
  };

  publicAPI.initializeFields = () => {
    model.arrays = [];
    model.copyFieldFlags = {};
    publicAPI.modified();
  };

  publicAPI.copyStructure = (other) => {
    publicAPI.initializeFields();
    model.copyFieldFlags = other.getCopyFieldFlags().map((x) => x); // Deep-copy
    model.arrays = other.arrays().map((x) => ({ array: x })); // Deep-copy
    // TODO: Copy array information objects (once we support information objects)
  };

  publicAPI.getNumberOfArrays = () => model.arrays.length;
  publicAPI.getNumberOfActiveArrays = () => model.arrays.length;
  publicAPI.addArray = (arr) => {
    model.arrays = [].concat(model.arrays, { data: arr });
    return model.arrays.length - 1;
  };
  publicAPI.removeAllArrays = () => {
    model.arrays = [];
  };
  publicAPI.removeArray = (arrayName) => {
    model.arrays = model.arrays.filter(
      (entry) => arrayName !== entry.data.getName()
    );
  };
  publicAPI.removeArrayByIndex = (arrayIdx) => {
    model.arrays = model.arrays.filter((entry, idx) => idx !== arrayIdx);
  };
  publicAPI.getArrays = () => model.arrays.map((entry) => entry.data);
  publicAPI.getArray = (arraySpec) =>
    typeof arraySpec === 'number'
      ? publicAPI.getArrayByIndex(arraySpec)
      : publicAPI.getArrayByName(arraySpec);
  publicAPI.getArrayByName = (arrayName) =>
    model.arrays.reduce(
      (a, b, i) => (b.data.getName() === arrayName ? b.data : a),
      null
    );
  publicAPI.getArrayWithIndex = (arrayName) =>
    model.arrays.reduce(
      (a, b, i) =>
        b.data && b.data.getName() === arrayName
          ? { array: b.data, index: i }
          : a,
      { array: null, index: -1 }
    );
  publicAPI.getArrayByIndex = (idx) =>
    idx >= 0 && idx < model.arrays.length ? model.arrays[idx].data : null;
  publicAPI.hasArray = (arrayName) =>
    publicAPI.getArrayWithIndex(arrayName).index >= 0;
  publicAPI.getArrayName = (idx) => {
    const arr = model.arrays[idx];
    return arr ? arr.data.getName() : '';
  };
  publicAPI.getCopyFieldFlags = () => model.copyFieldFlags;
  publicAPI.getFlag = (arrayName) => model.copyFieldFlags[arrayName];
  publicAPI.passData = (other, fromId = -1, toId = -1) => {
    other.getArrays().forEach((arr) => {
      const copyFlag = publicAPI.getFlag(arr.getName());
      if (
        copyFlag !== false &&
        !(model.doCopyAllOff && copyFlag !== true) &&
        arr
      ) {
        let destArr = publicAPI.getArrayByName(arr.getName());
        if (!destArr) {
          if (fromId < 0 || fromId > arr.getNumberOfTuples()) {
            publicAPI.addArray(arr);
          } else {
            const ncomps = arr.getNumberOfComponents();
            let newSize = arr.getNumberOfValues();
            const tId = toId > -1 ? toId : fromId;
            if (newSize < tId * ncomps) {
              newSize = (tId + 1) * ncomps;
            }
            destArr = vtk_js_Sources_Common_Core_DataArray__WEBPACK_IMPORTED_MODULE_2__.default.newInstance({
              name: arr.getName(),
              dataType: arr.getDataType(),
              numberOfComponents: arr.getNumberOfComponents(),
              size: newSize,
            });
            destArr.setTuple(tId, arr.getTuple(fromId));
            publicAPI.addArray(destArr);
          }
        } else if (
          arr.getNumberOfComponents() === destArr.getNumberOfComponents()
        ) {
          if (fromId > -1 && fromId < arr.getNumberOfTuples()) {
            const tId = toId > -1 ? toId : fromId;
            destArr.setTuple(tId, arr.getTuple(fromId));
          } else {
            // if fromId and not provided, just copy all (or as much possible)
            // of arr to destArr.
            for (let i = 0; i < arr.getNumberOfTuples(); ++i) {
              destArr.setTuple(i, arr.getTuple(i));
            }
          }
        }
      }
    });
  };
  publicAPI.copyFieldOn = (arrayName) => {
    model.copyFieldFlags[arrayName] = true;
  };
  publicAPI.copyFieldOff = (arrayName) => {
    model.copyFieldFlags[arrayName] = false;
  };
  publicAPI.copyAllOn = () => {
    if (!model.doCopyAllOn || model.doCopyAllOff) {
      model.doCopyAllOn = true;
      model.doCopyAllOff = false;
      publicAPI.modified();
    }
  };
  publicAPI.copyAllOff = () => {
    if (model.doCopyAllOn || !model.doCopyAllOff) {
      model.doCopyAllOn = false;
      model.doCopyAllOff = true;
      publicAPI.modified();
    }
  };
  publicAPI.clearFieldFlags = () => {
    model.copyFieldFlags = {};
  };
  publicAPI.deepCopy = (other) => {
    model.arrays = other.getArrays().map((arr) => {
      const arrNew = arr.newClone();
      arrNew.deepCopy(arr);
      return { data: arrNew };
    });
  };
  publicAPI.copyFlags = (other) => other.getCopyFieldFlags().map((x) => x);
  // TODO: publicAPI.squeeze = () => model.arrays.forEach(entry => entry.data.squeeze());
  publicAPI.reset = () => model.arrays.forEach((entry) => entry.data.reset());
  // TODO: getActualMemorySize
  publicAPI.getMTime = () =>
    model.arrays.reduce(
      (a, b) => (b.data.getMTime() > a ? b.data.getMTime() : a),
      model.mtime
    );
  // TODO: publicAPI.getField = (ids, other) => { copy ids from other into this model's arrays }
  // TODO: publicAPI.getArrayContainingComponent = (component) => ...
  publicAPI.getNumberOfComponents = () =>
    model.arrays.reduce((a, b) => a + b.data.getNumberOfComponents(), 0);
  publicAPI.getNumberOfTuples = () =>
    model.arrays.length > 0 ? model.arrays[0].getNumberOfTuples() : 0;

  publicAPI.getState = () => {
    const result = superGetState();
    result.arrays = model.arrays.map((item) => ({
      data: item.data.getState(),
    }));
    return result;
  };
}

const DEFAULT_VALUES = {
  arrays: [],
  copyFieldFlags: [], // fields not to copy
  doCopyAllOn: true,
  doCopyAllOff: false,
};

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__.default.obj(publicAPI, model);

  vtkFieldData(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_1__.default.newInstance(extend, 'vtkFieldData');

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend });


/***/ }),
/* 44 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "FieldDataTypes": () => (/* binding */ FieldDataTypes),
/* harmony export */   "FieldAssociations": () => (/* binding */ FieldAssociations),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// Specify how data arrays can be used by data objects
const FieldDataTypes = {
  UNIFORM: 0, // data that does not vary over points/cells/etc.
  DATA_OBJECT_FIELD: 0, // to match VTK

  COORDINATE: 1, // data that specifies the location of each point
  POINT_DATA: 1, // to match VTK

  POINT: 2, // data defined at each point, but that does not specify the point location
  POINT_FIELD_DATA: 2, // to match VTK

  CELL: 3, // data defined at each cell, but that does not specify the cell
  CELL_FIELD_DATA: 3, // to match VTK

  VERTEX: 4, // data defined at each graph vertex, but that does not specify the graph vertex
  VERTEX_FIELD_DATA: 4, // to match VTK

  EDGE: 5, // data defined at each graph edge, but that does not specify the graph edge
  EDGE_FIELD_DATA: 5, // to match VTK

  ROW: 6, // data specifying a table row
  ROW_DATA: 6, // to match VTK
};

const FieldAssociations = {
  FIELD_ASSOCIATION_POINTS: 0,
  FIELD_ASSOCIATION_CELLS: 1,
  FIELD_ASSOCIATION_NONE: 2,
  FIELD_ASSOCIATION_POINTS_THEN_CELLS: 3,
  FIELD_ASSOCIATION_VERTICES: 4,
  FIELD_ASSOCIATION_EDGES: 5,
  FIELD_ASSOCIATION_ROWS: 6,
  NUMBER_OF_ASSOCIATIONS: 7,
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  FieldDataTypes,
  FieldAssociations,
});


/***/ }),
/* 45 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "STATIC": () => (/* binding */ STATIC),
/* harmony export */   "extend": () => (/* binding */ extend),
/* harmony export */   "newInstance": () => (/* binding */ newInstance),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(14);
/* harmony import */ var vtk_js_Sources_Common_DataModel_Cell__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(35);
/* harmony import */ var vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(17);
/* harmony import */ var vtk_js_Sources_Common_DataModel_Line__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(38);
/* harmony import */ var vtk_js_Sources_Common_DataModel_Plane__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(27);






// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

function computeNormalDirection(v1, v2, v3, n) {
  // order is important!!! maintain consistency with triangle vertex order
  const ax = v3[0] - v2[0];
  const ay = v3[1] - v2[1];
  const az = v3[2] - v2[2];
  const bx = v1[0] - v2[0];
  const by = v1[1] - v2[1];
  const bz = v1[2] - v2[2];

  n[0] = ay * bz - az * by;
  n[1] = az * bx - ax * bz;
  n[2] = ax * by - ay * bx;
}

function computeNormal(v1, v2, v3, n) {
  computeNormalDirection(v1, v2, v3, n);
  const length = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
  if (length !== 0.0) {
    n[0] /= length;
    n[1] /= length;
    n[2] /= length;
  }
}

// ----------------------------------------------------------------------------
// Static API
// ----------------------------------------------------------------------------

const STATIC = {
  computeNormalDirection,
  computeNormal,
};

// ----------------------------------------------------------------------------
// vtkTriangle methods
// ----------------------------------------------------------------------------

function vtkTriangle(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkTriangle');

  publicAPI.getCellDimension = () => 2;
  publicAPI.intersectWithLine = (p1, p2, tol, x, pcoords) => {
    const outObj = { subId: 0, t: 0, intersect: -1 };
    pcoords[2] = 0.0;
    const closestPoint = [];
    const tol2 = tol * tol;

    // Get normal for triangle
    const pt1 = [];
    const pt2 = [];
    const pt3 = [];
    model.points.getPoint(0, pt1);
    model.points.getPoint(1, pt2);
    model.points.getPoint(2, pt3);
    const n = [];
    const weights = [];
    computeNormal(pt1, pt2, pt3, n);
    if (n[0] !== 0 || n[1] !== 0 || n[2] !== 0) {
      // Intersect plane of triangle with line
      const plane = vtk_js_Sources_Common_DataModel_Plane__WEBPACK_IMPORTED_MODULE_4__.default.intersectWithLine(p1, p2, pt1, n);
      outObj.t = plane.t;
      x[0] = plane.x[0];
      x[1] = plane.x[1];
      x[2] = plane.x[2];
      if (!plane.intersection) {
        pcoords[0] = 0.0;
        pcoords[1] = 0.0;
        outObj.intersect = 0;
        return outObj;
      }

      // Evaluate position
      const inside = publicAPI.evaluatePosition(
        x,
        closestPoint,
        pcoords,
        weights
      );
      if (inside.evaluation >= 0) {
        if (inside.dist2 <= tol2) {
          outObj.intersect = 1;
          return outObj;
        }
        outObj.intersect = inside.evaluation;
        return outObj;
      }
    }

    // Normals are null, so the triangle is degenerated and
    // we still need to check intersection between line and
    // the longest edge.
    const dist2Pt1Pt2 = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_2__.distance2BetweenPoints(pt1, pt2);
    const dist2Pt2Pt3 = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_2__.distance2BetweenPoints(pt2, pt3);
    const dist2Pt3Pt1 = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_2__.distance2BetweenPoints(pt3, pt1);
    if (!model.line) {
      model.line = vtk_js_Sources_Common_DataModel_Line__WEBPACK_IMPORTED_MODULE_3__.default.newInstance();
    }
    if (dist2Pt1Pt2 > dist2Pt2Pt3 && dist2Pt1Pt2 > dist2Pt3Pt1) {
      model.line.getPoints().setPoint(0, pt1);
      model.line.getPoints().setPoint(1, pt2);
    } else if (dist2Pt2Pt3 > dist2Pt3Pt1 && dist2Pt2Pt3 > dist2Pt1Pt2) {
      model.line.getPoints().setPoint(0, pt2);
      model.line.getPoints().setPoint(1, pt3);
    } else {
      model.line.getPoints().setPoint(0, pt3);
      model.line.getPoints().setPoint(1, pt1);
    }

    const intersectLine = model.line.intersectWithLine(p1, p2, tol, x, pcoords);
    if (intersectLine.intersect) {
      const pt3Pt1 = [];
      const pt3Pt2 = [];
      const pt3X = [];
      // Compute r and s manually, using dot and norm.
      for (let i = 0; i < 3; i++) {
        pt3Pt1[i] = pt1[i] - pt3[i];
        pt3Pt2[i] = pt2[i] - pt3[i];
        pt3X[i] = x[i] - pt3[i];
      }
      pcoords[0] = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_2__.dot(pt3X, pt3Pt1) / dist2Pt3Pt1;
      pcoords[1] = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_2__.dot(pt3X, pt3Pt2) / dist2Pt2Pt3;
      outObj.evaluation = 1;
      return outObj;
    }

    pcoords[0] = 0.0;
    pcoords[1] = 0.0;
    outObj.evaluation = 0;
    return outObj;
  };

  publicAPI.evaluatePosition = (x, closestPoint, pcoords, weights) => {
    // will return obj
    const outObj = { subId: 0, dist2: 0, evaluation: -1 };
    let i;
    let j;
    const pt1 = [];
    const pt2 = [];
    const pt3 = [];
    const n = [];
    let fabsn;
    const rhs = [];
    const c1 = [];
    const c2 = [];
    let det = 0;
    let idx = 0;
    const indices = [];
    let dist2Point;
    let dist2Line1;
    let dist2Line2;
    let closest = [];
    const closestPoint1 = [];
    const closestPoint2 = [];
    const cp = [];

    outObj.subId = 0;
    pcoords[2] = 0.0;

    // Get normal for triangle, only the normal direction is needed, i.e. the
    // normal need not be normalized (unit length)
    //
    model.points.getPoint(1, pt1);
    model.points.getPoint(2, pt2);
    model.points.getPoint(0, pt3);

    computeNormalDirection(pt1, pt2, pt3, n);

    // Project point to plane
    vtk_js_Sources_Common_DataModel_Plane__WEBPACK_IMPORTED_MODULE_4__.default.generalizedProjectPoint(x, pt1, n, cp);

    // Construct matrices.  Since we have over determined system, need to find
    // which 2 out of 3 equations to use to develop equations. (Any 2 should
    // work since we've projected point to plane.)
    let maxComponent = 0.0;
    for (i = 0; i < 3; i++) {
      // trying to avoid an expensive call to fabs()
      if (n[i] < 0) {
        fabsn = -n[i];
      } else {
        fabsn = n[i];
      }
      if (fabsn > maxComponent) {
        maxComponent = fabsn;
        idx = i;
      }
    }

    for (j = 0, i = 0; i < 3; i++) {
      if (i !== idx) {
        indices[j++] = i;
      }
    }

    for (i = 0; i < 2; i++) {
      rhs[i] = cp[indices[i]] - pt3[indices[i]];
      c1[i] = pt1[indices[i]] - pt3[indices[i]];
      c2[i] = pt2[indices[i]] - pt3[indices[i]];
    }
    det = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_2__.determinant2x2(c1, c2);
    if (det === 0.0) {
      pcoords[0] = 0.0;
      pcoords[1] = 0.0;
      outObj.evaluation = -1;
      return outObj;
    }

    pcoords[0] = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_2__.determinant2x2(rhs, c2) / det;
    pcoords[1] = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_2__.determinant2x2(c1, rhs) / det;

    // Okay, now find closest point to element
    weights[0] = 1 - (pcoords[0] + pcoords[1]);
    weights[1] = pcoords[0];
    weights[2] = pcoords[1];

    if (
      weights[0] >= 0.0 &&
      weights[0] <= 1.0 &&
      weights[1] >= 0.0 &&
      weights[1] <= 1.0 &&
      weights[2] >= 0.0 &&
      weights[2] <= 1.0
    ) {
      // projection distance
      if (closestPoint) {
        outObj.dist2 = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_2__.distance2BetweenPoints(cp, x);
        closestPoint[0] = cp[0];
        closestPoint[1] = cp[1];
        closestPoint[2] = cp[2];
      }
      outObj.evaluation = 1;
    } else {
      let t;
      if (closestPoint) {
        if (weights[1] < 0.0 && weights[2] < 0.0) {
          dist2Point = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_2__.distance2BetweenPoints(x, pt3);
          dist2Line1 = vtk_js_Sources_Common_DataModel_Line__WEBPACK_IMPORTED_MODULE_3__.default.distanceToLine(x, pt1, pt3, t, closestPoint1);
          dist2Line2 = vtk_js_Sources_Common_DataModel_Line__WEBPACK_IMPORTED_MODULE_3__.default.distanceToLine(x, pt3, pt2, t, closestPoint2);
          if (dist2Point < dist2Line1) {
            outObj.dist2 = dist2Point;
            closest = pt3;
          } else {
            outObj.dist2 = dist2Line1;
            closest = closestPoint1;
          }
          if (dist2Line2 < outObj.dist2) {
            outObj.dist2 = dist2Line2;
            closest = closestPoint2;
          }
          for (i = 0; i < 3; i++) {
            closestPoint[i] = closest[i];
          }
        } else if (weights[2] < 0.0 && weights[0] < 0.0) {
          dist2Point = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_2__.distance2BetweenPoints(x, pt1);
          dist2Line1 = vtk_js_Sources_Common_DataModel_Line__WEBPACK_IMPORTED_MODULE_3__.default.distanceToLine(x, pt1, pt3, t, closestPoint1);
          dist2Line2 = vtk_js_Sources_Common_DataModel_Line__WEBPACK_IMPORTED_MODULE_3__.default.distanceToLine(x, pt1, pt2, t, closestPoint2);
          if (dist2Point < dist2Line1) {
            outObj.dist2 = dist2Point;
            closest = pt1;
          } else {
            outObj.dist2 = dist2Line1;
            closest = closestPoint1;
          }
          if (dist2Line2 < outObj.dist2) {
            outObj.dist2 = dist2Line2;
            closest = closestPoint2;
          }
          for (i = 0; i < 3; i++) {
            closestPoint[i] = closest[i];
          }
        } else if (weights[1] < 0.0 && weights[0] < 0.0) {
          dist2Point = vtk_js_Sources_Common_Core_Math__WEBPACK_IMPORTED_MODULE_2__.distance2BetweenPoints(x, pt2);
          dist2Line1 = vtk_js_Sources_Common_DataModel_Line__WEBPACK_IMPORTED_MODULE_3__.default.distanceToLine(x, pt2, pt3, t, closestPoint1);
          dist2Line2 = vtk_js_Sources_Common_DataModel_Line__WEBPACK_IMPORTED_MODULE_3__.default.distanceToLine(x, pt1, pt2, t, closestPoint2);
          if (dist2Point < dist2Line1) {
            outObj.dist2 = dist2Point;
            closest = pt2;
          } else {
            outObj.dist2 = dist2Line1;
            closest = closestPoint1;
          }
          if (dist2Line2 < outObj.dist2) {
            outObj.dist2 = dist2Line2;
            closest = closestPoint2;
          }
          for (i = 0; i < 3; i++) {
            closestPoint[i] = closest[i];
          }
        } else if (weights[0] < 0.0) {
          const lineDistance = vtk_js_Sources_Common_DataModel_Line__WEBPACK_IMPORTED_MODULE_3__.default.distanceToLine(
            x,
            pt1,
            pt2,
            closestPoint
          );
          outObj.dist2 = lineDistance.distance;
        } else if (weights[1] < 0.0) {
          const lineDistance = vtk_js_Sources_Common_DataModel_Line__WEBPACK_IMPORTED_MODULE_3__.default.distanceToLine(
            x,
            pt2,
            pt3,
            closestPoint
          );
          outObj.dist2 = lineDistance.distance;
        } else if (weights[2] < 0.0) {
          const lineDistance = vtk_js_Sources_Common_DataModel_Line__WEBPACK_IMPORTED_MODULE_3__.default.distanceToLine(
            x,
            pt1,
            pt3,
            closestPoint
          );
          outObj.dist2 = lineDistance.distance;
        }
      }
      outObj.evaluation = 0;
    }

    return outObj;
  };

  publicAPI.evaluateLocation = (pcoords, x, weights) => {
    const p0 = [];
    const p1 = [];
    const p2 = [];
    model.points.getPoint(0, p0);
    model.points.getPoint(1, p1);
    model.points.getPoint(2, p2);
    const u3 = 1.0 - pcoords[0] - pcoords[1];

    for (let i = 0; i < 3; i++) {
      x[i] = p0[i] * u3 + p1[i] * pcoords[0] + p2[i] * pcoords[1];
    }

    weights[0] = u3;
    weights[1] = pcoords[0];
    weights[2] = pcoords[1];
  };

  publicAPI.getParametricDistance = (pcoords) => {
    let pDist;
    let pDistMax = 0.0;
    const pc = [];
    pc[0] = pcoords[0];
    pc[1] = pcoords[1];
    pc[2] = 1.0 - pcoords[0] - pcoords[1];

    for (let i = 0; i < 3; i++) {
      if (pc[i] < 0.0) {
        pDist = -pc[i];
      } else if (pc[i] > 1.0) {
        pDist = pc[i] - 1.0;
      } else {
        // inside the cell in the parametric direction
        pDist = 0.0;
      }
      if (pDist > pDistMax) {
        pDistMax = pDist;
      }
    }
    return pDistMax;
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {};

// ----------------------------------------------------------------------------

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtk_js_Sources_Common_DataModel_Cell__WEBPACK_IMPORTED_MODULE_1__.default.extend(publicAPI, model, initialValues);

  vtkTriangle(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = vtk_js_Sources_macro__WEBPACK_IMPORTED_MODULE_0__.default.newInstance(extend, 'vtkTriangle');

// ----------------------------------------------------------------------------

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ newInstance, extend, ...STATIC });


/***/ }),
/* 46 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "POLYDATA_FIELDS": () => (/* binding */ POLYDATA_FIELDS),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const POLYDATA_FIELDS = ['verts', 'lines', 'polys', 'strips'];

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  POLYDATA_FIELDS,
});


/***/ }),
/* 47 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "NormalCollector": () => (/* binding */ NormalCollector)
/* harmony export */ });
/* harmony import */ var gl_matrix__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(10);
/* harmony import */ var _mergelocator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(48);
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */


class NormalCollector extends _mergelocator__WEBPACK_IMPORTED_MODULE_0__.MergeLocator {
  constructor(info, forVtk, blocks) {
    super(info, forVtk);
    this.info = info;
    this.forVtk = forVtk;
    this.blocks = blocks;
    this.oldMeshes = void 0;
    this.normals = [];

    this.createLocator = () => {
      const mergeLocator = new _mergelocator__WEBPACK_IMPORTED_MODULE_0__.MergeLocator(this.info, this.forVtk);
      return mergeLocator;
    };

    this.oldMeshes = Array(blocks.getBlockCount());
  }

  extractWholeMesh() {
    const mergeLocator = new _mergelocator__WEBPACK_IMPORTED_MODULE_0__.MergeLocator(this.info, true);
    this.oldMeshes.forEach(m => {
      for (let i = 0; i < m.indices.length; i += 3) {
        const index0 = m.indices[i];
        const index1 = m.indices[i + 1];
        const index2 = m.indices[i + 2];
        const p0 = [m.vertices[index0 * 3], m.vertices[index0 * 3 + 1], m.vertices[index0 * 3 + 2]];
        const p1 = [m.vertices[index1 * 3], m.vertices[index1 * 3 + 1], m.vertices[index1 * 3 + 2]];
        const p2 = [m.vertices[index2 * 3], m.vertices[index2 * 3 + 1], m.vertices[index2 * 3 + 2]];
        mergeLocator.insertTriangles([p0, p1, p2]);
      }
    });
    return mergeLocator.getValue();
  } // 如果可以使用32位的index buffer, 那么可以将NormalCollector返回， 所有geometry公用一个index buffer.
  // 但是由于发现32位的index buffer有随机错误， 故而现在此方法不可用， 等找到解决方案之后可以优化。
  // 当前此createLocator并没有实际用处。


  updateBlock(mesh, blockIndex) {
    if (this.oldMeshes[blockIndex]) {
      this.internalUpdateMesh(this.oldMeshes[blockIndex], -1);
    }

    this.internalUpdateMesh(mesh, 1);
    this.oldMeshes[blockIndex] = mesh;
  }

  doInsertPoint(p) {
    this.vertices.push(p[0]);
    this.vertices.push(p[1]);
    this.vertices.push(p[2]);
    this.normals.push(0);
    this.normals.push(0);
    this.normals.push(0);
    return this.vertices.length / 3 - 1;
  }

  fillNormal(mesh) {
    const normals = new Float32Array(mesh.vertices.length);

    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const iV = this.insertUniquePoint([mesh.vertices[i], mesh.vertices[i + 1], mesh.vertices[i + 2]]);
      const n = gl_matrix__WEBPACK_IMPORTED_MODULE_1__.normalize([0, 0, 0], gl_matrix__WEBPACK_IMPORTED_MODULE_1__.fromValues(this.normals[iV * 3], this.normals[iV * 3 + 1], this.normals[iV * 3 + 2]));
      normals[i + 0] = -n[0];
      normals[i + 1] = -n[1];
      normals[i + 2] = -n[2];
    } // eslint-disable-next-line no-param-reassign


    mesh.normals = normals;
    return mesh;
  }

  internalUpdateMesh(mesh, multiplier) {
    const indexArray = mesh.indices;
    const vertexData = mesh.vertices;

    for (let i = 0; i < indexArray.length; i += 3) {
      const vA = [vertexData[indexArray[i] * 3 + 0], vertexData[indexArray[i] * 3 + 1], vertexData[indexArray[i] * 3 + 2]];
      const vB = [vertexData[indexArray[i + 1] * 3 + 0], vertexData[indexArray[i + 1] * 3 + 1], vertexData[indexArray[i + 1] * 3 + 2]];
      const vC = [vertexData[indexArray[i + 2] * 3 + 0], vertexData[indexArray[i + 2] * 3 + 1], vertexData[indexArray[i + 2] * 3 + 2]];
      const cb = gl_matrix__WEBPACK_IMPORTED_MODULE_1__.sub([0, 0, 0], vC, vB);
      const ab = gl_matrix__WEBPACK_IMPORTED_MODULE_1__.sub([0, 0, 0], vA, vB);
      const n = gl_matrix__WEBPACK_IMPORTED_MODULE_1__.cross([0, 0, 0], ab, cb);
      n[0] *= multiplier;
      n[1] *= multiplier;
      n[2] *= multiplier;
      const iA = this.insertUniquePoint(vA) * 3;
      const iB = this.insertUniquePoint(vB) * 3;
      const iC = this.insertUniquePoint(vC) * 3;
      this.normals[iA + 0] += n[0];
      this.normals[iA + 1] += n[1];
      this.normals[iA + 2] += n[2];
      this.normals[iB + 0] += n[0];
      this.normals[iB + 1] += n[1];
      this.normals[iB + 2] += n[2];
      this.normals[iC + 0] += n[0];
      this.normals[iC + 1] += n[1];
      this.normals[iC + 2] += n[2];
    }
  }

}

/***/ }),
/* 48 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "MergeLocator": () => (/* binding */ MergeLocator),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
class MergeLocator {
  constructor(info, forVtk) {
    this.info = info;
    this.forVtk = forVtk;
    this.origin = void 0;
    this.size = void 0;
    this.spacing = void 0;
    this.dspacing = void 0;
    this.layerSize = void 0;
    this.m = new Map();
    this.indices = [];
    this.vertices = [];
    this.origin = info.origin;
    this.size = info.size;
    this.spacing = info.spacing;
    this.layerSize = this.size[0] * this.size[1];
    this.dspacing = this.spacing.map(v => 1 / v);
  }

  physicalToIndex(p) {
    return Math.floor((p[2] - this.origin[2]) * this.dspacing[2]) * this.layerSize + Math.floor((p[1] - this.origin[1]) * this.dspacing[1]) * this.size[0] + Math.floor((p[0] - this.origin[0]) * this.dspacing[0]);
  }

  doInsertPoint(p) {
    this.vertices.push(p[0]);
    this.vertices.push(p[1]);
    this.vertices.push(p[2]);
    return this.vertices.length / 3 - 1;
  }

  insertUniquePoint(p) {
    const index = this.physicalToIndex(p);
    let points = [];

    if (this.m.has(index)) {
      points = this.m.get(index);
    } else {
      this.m.set(index, points);
      const id = this.doInsertPoint(p);
      points.push(id);
      return id;
    }

    for (let i = 0; i < points.length; i++) {
      const opId = points[i];

      if (this.vertices[opId * 3] === p[0] && this.vertices[opId * 3 + 1] === p[1] && this.vertices[opId * 3 + 2] === p[2]) {
        return opId;
      }
    }

    const id = this.doInsertPoint(p);
    points.push(id);
    return id;
  }

  insertTriangles([p0, p1, p2]) {
    const id0 = this.insertUniquePoint(p0);
    const id1 = this.insertUniquePoint(p1);
    const id2 = this.insertUniquePoint(p2);

    if (this.forVtk) {
      this.indices.push(3);
    }

    this.indices.push(id0);
    this.indices.push(id1);
    this.indices.push(id2);
  }

  getValue() {
    return {
      indices: this.indices,
      vertices: this.vertices
    };
  }

}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (forVtk => info => {
  return new MergeLocator(info, forVtk);
});

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/amd define */
/******/ 	(() => {
/******/ 		__webpack_require__.amdD = function () {
/******/ 			throw new Error('define cannot be used indirect');
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/amd options */
/******/ 	(() => {
/******/ 		__webpack_require__.amdO = {};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var _maskgeometry__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable no-restricted-globals */


let maskGeometry;

const niftiBufferInit = (buffer, size, origin, spacing, labels) => {
  maskGeometry = new _maskgeometry__WEBPACK_IMPORTED_MODULE_1__.MaskGeometry(buffer, {
    size,
    origin,
    spacing
  }, labels);
};

const updateGeometry = dirtyBlocks => {
  return maskGeometry.updateCoarse(dirtyBlocks);
};

const updateRegionToGeometry = regions => {
  return maskGeometry.updateRegionToCoarseGeometry(regions);
};

const marchingCubeSmooth = () => {
  return maskGeometry.getSmoothGeometry();
};

const functions = {
  updateRegionToGeometry,
  niftiBufferInit,
  updateGeometry,
  marchingCubeSmooth
};
(0,comlink__WEBPACK_IMPORTED_MODULE_0__.expose)(functions);
})();

/******/ })()
;