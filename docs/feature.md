### 功能点覆盖

- 获取 case 列表

  用[GET entries](https://docs.strapi.io/developer-docs/latest/developer-resources/database-apis-reference/rest-api.html#get-entries)获取。

  例：

  ```
  //GET
  http://localhost:1337/api/cases
  ```

- [T23524:已读未读](https://pha.curacloudplatform.com/T23524)

  更新 case 字段 readed 为 true， [Update an entry](https://docs.strapi.io/developer-docs/latest/developer-resources/database-apis-reference/rest-api.html#update-an-entry) 参数。
  例：

  ```
  //PUT
  http://localhost:1337/api/cases/1
  {
    "data": {
        "readed": true
    }
  }
  ```

- [T22827:查询、筛选 case 列表](https://pha.curacloudplatform.com/T22827)

  筛选传入 [filter](https://docs.strapi.io/developer-docs/latest/developer-resources/database-apis-reference/rest/filtering-locale-publication.html#filtering) 参数。
  例：

  ```
  //GET
  http://localhost:1337/api/cases?filters[PatientID][$eq]=493243&populate=*
  ```

- 详情页

  通过当前 case 的 workflowID，获取相关联的 operators，根据 operators 数组内容依次渲染每个 operator 的内容。
  例：

  ```
  //GET
  http://localhost:1337/api/operators?filters[workflowID][$eq]=wf1
  ```

- 下载数据

  获取文件 buffer 并创建 blob， 通过模拟点击 link 下载到本地。

  ```js
  const download = (pdf: ArrayBuffer, filename: string) => {
    const blob = new Blob([pdf], { type: 'application/pdf' });
    const objectURL = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = filename;
    a.href = objectURL;
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(objectURL);
    }, 60 * 1000);
  };
  ```

- tools

  - QC
  - Segment/Refine
  - Validate FFR
  - Report
