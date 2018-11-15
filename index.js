require('dotenv').config();
const { RTMClient, WebClient } = require('@slack/client');
const http = require('http');

const api = {
  rtm: {
    from: new RTMClient(process.env.FromToken),
    to: new RTMClient(process.env.ToToken)
  },
  web: {
    from: new WebClient(process.env.FromToken),
    to: new WebClient(process.env.ToToken),
    legacy: {
      from: new WebClient(process.env.FromLegacyToken),
      to: new WebClient(process.env.ToToken),
    }
  },
};

const pipe = io => {
  const oi = io === 'from' ? 'to' : 'from';
  const ioChannel = io === 'from' ? process.env.FromChannel : process.env.ToChannel;
  const oiChannel = oi === 'from' ? process.env.FromChannel : process.env.ToChannel;
  api.rtm[io].on('message', message => {
    if (!message.subtype && message.user === api.rtm[io].activeUserId) return true;
    if (!message.subtype && io === 'to' && message.channel[0] === 'D') {
      if ('files' in message) {
        for (const file of message.files) api.web.legacy[io].files.delete({file: file.id});
        return true;
      }
      api.web[io].chat.postMessage({
        channel: message.channel,
        text: '→ #random',
        username: 'system'
      });
      return true;
    }
    if (message.subtype || message.channel !== ioChannel) return true;
    if ('files' in message) {
      for (const file of message.files) api.web.legacy[io].files.delete({file: file.id});
      return true;
    }
    api.web.legacy[io].users.profile.get({ user: message.user }).then(res => {
      if (io === 'to') {
        api.web[oi].chat.postMessage({
          channel: oiChannel,
          text: message.text,
          username: res.profile.display_name || res.profile.real_name
        });
        return true;
      }
      api.web[oi].users.profile.set({ profile: { first_name: res.profile.display_name } }).then(() => {
        api.web[oi].chat.postMessage({
          channel: oiChannel,
          text: '`' + res.profile.display_name + '` ' + message.text,
          as_user: true,
        });
      });
    });
  });
};

pipe('from');
api.rtm.from.start();
pipe('to');
api.rtm.to.start();

http.createServer((req, res)=>{
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write('slack-pipe');
  res.end();
}).listen(process.env.PORT, '0.0.0.0', () => console.log(`Server running at ${process.env.PORT}`));
