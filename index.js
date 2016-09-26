const request = require('superagent')
const { Client } = require('eris')

class Bot {
  constructor (token, ownerID) {
    this._token = token
    this._ownerID = ownerID
  }

  createEmoji (msg, link, name, cb) {
    request
    .get(link)
    .end((err, res) => {
      if (err) return console.error(err)
      let buf = res.body
      let type = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF ? 'data:image/jpeg;base64,' : 'data:image/png;base64,'
      this.client.createGuildEmoji(msg.channel.guild.id, {
        name: name,
        image: `${type}${res.body.toString('base64')}`
      })
      .then(res => {
        this.client.editMessage(msg.channel.id, msg.id, `added **${res.name}** to ${msg.channel.guild.name}`)
        console.log(res)
        if (typeof cb === 'function') return cb(res)
      })
      .catch(err => {
        console.error(err)
        this.client.deleteMessage(msg.channel.id, msg.id)
      })
    })
  }

  emojiLoop (idx = 0, max = 1, msg, emojis) {
    if (idx === max) return
    let emoji = emojis[idx]
    const cb = res => {
      console.log(`transferred emoji ${emoji.name} to ${msg.channel.guild.name}`)
      this.emojiLoop(++idx, max, msg, emojis)
      this.client.editMessage(msg.channel.id, msg.id, `added **${idx + 1} emojis to ${msg.channel.guild.name}`)
    }
    this.createEmoji(msg, `https://cdn.discordapp.com/emojis/${emoji.id}.png`, emoji.name, cb)
  }

  delEmoji (msg, id, cb) {
    this.client.deleteGuildEmoji(msg.channel.guild.id, id)
    .then(() => {
      if (typeof cb === 'function') return cb()
    })
    .catch(err => console.error(err))
  }

  delEmojiLoop (idx = 0, max = 1, msg, emojis) {
    if (idx === max) return
    let emoji = emojis[idx]
    const cb = () => {
      console.log(`deleted emoji ${emoji.id} in ${msg.channel.guild.name}`)
      this.delEmojiLoop(++idx, max, msg, emojis)
      this.client.editMessage(msg.channel.id, msg.id, `deleted **${idx + 1}** emojis from ${msg.channel.guild.name}`)
    }
    this.delEmoji(msg, emoji.id, cb)
  }

  start () {
    const client = new Client(this._token, {
      messageLimit: 1,
      sequencerWait: 2,
      disableEveryone: true
    })

    client.on('ready', () => {
      console.log(`ready as ${client.user.username}`)
      console.log(`guilds: ${client.guilds.size}`)
    })
    client.on('messageCreate', msg => {
      if (msg.author.id !== client.user.id) return
      let args = msg.content.split(' ')
      if (!args[0].startsWith('>>')) return
      args[0] = args[0].replace('>>', '')
      switch (args[0].toLowerCase()) {
        case 'emoji': {
          args.shift()
          if (args.length < 2) {
            console.log('insufficient params for emoji')
            client.deleteMessage(msg.channel.id, msg.id)
            return
          }
          this.createEmoji(msg, args[0], args[1])
          break
        }
        case 'noemoji': {
          if (args.length < 1) {
            console.log('insufficient params for emojimove')
            client.deleteMessage(msg.channel.id, msg.id)
            return
          }
          this.delEmoji(msg, args[0], () => {
            client.editMessage(msg.channel.id, msg.id, `deleted emoji ${args[0]} from ${msg.channel.guild.name}`)
          })
          break
        }
        case 'emojis': {
          args.shift()
          let id = args.length >= 1 ? args[0] : msg.channel.guild.id
          client.getGuildEmojis(id)
          .then(obj => {
            client.editMessage(msg.channel.id, msg.id, `found ${obj.length} emojis in **${id}**`)
            console.log(obj)
          })
          .catch(err => console.error(err))
          break
        }
        case 'emojimove': {
          args.shift()
          if (args.length < 1) {
            console.log('insufficient params for emojimove')
            client.deleteMessage(msg.channel.id, msg.id)
            return
          }
          client.getGuildEmojis(args[0])
          .then(emojis => {
            this.emojiLoop(0, emojis.length, msg, emojis)
          })
          .catch(err => console.error(err))
          break
        }
        case 'emojipurge': {
          client.getGuildEmojis(msg.channel.guild.id)
          .then(emojis => {
            this.delEmojiLoop(0, emojis.length, msg, emojis)
          })
        }
      }
    })
    client.connect()
    this.client = client
  }
}

const bot = new Bot(require('./config.json').TOKEN)
bot.start()
