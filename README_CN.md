# 寻花 flower-lookup

flower-lookup 从 unsetbit/onramp fork，在此基础上进行了细微的修改，添加了一些我需要的特性。
onramp 是一个 websocket 服务器，通过它，浏览器之间可以建立对等链接。
寻花是花园项目的桥接节点，可以帮助找到各个花朵。

花园项目适合有限集合的浏览器点对点网络。

## 使用

1. 安装 Node 0.10+
2. 执行 `yarn global add flower-lookup`
3. 执行 `flower-lookup`

You can pass `-h [host]` to change set the host of the server. By default it will use "localhost:20500".

flower-lookup is purpose-built to work with [P](https://github.com/unsetbit/p).


[English README](README.md)