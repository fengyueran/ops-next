## 开发

### 主应用命令

- 启动

  启动后可以通过浏览器访问对应地址(默认为 http://localhost:3000)。

  ```
  yarn start
  ```

- 创建 jenkens 打包镜像

  ```
  yarn build:image
  ```

- 提取并编译多语言文件

  ```
  yarn create:message
  ```

### 启动微应用

主应用启动后，如果需要打开微应用，需要先启动微应用。
微应用位于`git@git.keyayun.com:keyayun/viewers-next.git`仓库下，将项目克隆到本地。
目录结构如下：

```
//viewers-next目录结构
├── viewers-next(项目根目录)
    ├── packages
    │   ├── qc
    │   ├── mask-edit
    │   ├── ffr-validate
    │   └── report
    │
    ├── ...
    └── package.json
```

微应用位于 packages 目录下，依次在 qc、 mask-edit、ffr-validate、report 文件下执行`yarn start:UMDlibTarget`启动微应用，确保它们的端口分别为 3001，3002，3003，3004(ops 主应用已经配置好)。
微应用 build 时的命令为`yarn build:UMDlibTarget`。
