#!/bin/zsh
cd "${0:A:h}"
interface=$(route -n get default 2>/dev/null | awk '/interface:/{print $2; exit}')
address=$(ipconfig getifaddr "$interface" 2>/dev/null)
if [[ -z "$address" ]]; then
  print "未找到当前局域网 IP。请检查教师电脑的网络连接。"
else
  print "学生访问：http://${address}:8784/"
fi
print "教师在这台电脑打开：http://localhost:8784/teacher"
if curl --noproxy '*' -fsS -o /dev/null http://127.0.0.1:8784/; then
  print "课堂服务状态：运行中"
else
  print "课堂服务状态：未运行；请检查自动启动服务或运行启动课堂.command。"
fi
