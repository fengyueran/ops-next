### 多语言修改流程

- 提取要翻译的语言

  执行`yarn extract:message`会在 translations 生成要翻译的中文文件 zh.json。

  ```json
  //zh.json
  {
    "x+2Be4": {
      "defaultMessage": "共{count}个任务"
    }
  }
  ```

- 翻译文件

  将 translations 中的所有文件交给翻译人员，翻译完成后替换原来 translations 下的文件。

- 编译多语言

  执行`yarn compile:message`会将 translations 中的文件编译成程序可识别的文件，输出到 src/locales 下。

  ```json
  //zh.json
  {
    "x+2Be4": [
      {
        "type": 0,
        "value": "共"
      },
      {
        "type": 1,
        "value": "count"
      },
      {
        "type": 0,
        "value": "个任务"
      }
    ]
  }
  //en.json
  {
    "x+2Be4": [
      {
        "type": 0,
        "value": "Total "
      },
      {
        "type": 1,
        "value": "count"
      },
      {
        "type": 0,
        "value": " Task"
      }
    ]
  }
  ```
