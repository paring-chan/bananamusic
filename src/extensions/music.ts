import { Arg, Command, Extension, Listener, Msg } from '@pikostudio/command.ts'
import { User } from 'discord.js'
import { Guild } from 'discord.js'
import { MessageReaction } from 'discord.js'
import { MessageEmbed } from 'discord.js'
import { Message } from 'discord.js'

declare module 'discord.js' {
  interface Guild {
    selectedTrack: number
  }
}

export default class Music extends Extension {
  @Command({ name: '재생', aliases: ['play', 'p'] })
  async play(@Msg() msg: Message, @Arg({ rest: true }) query: string) {
    if (!msg.member?.voice.channelID)
      return msg.reply('음성 채널에 들어가주세요')
    const player =
      this.client.music.players.get(msg.guild!.id) ??
      this.client.music.create({
        selfDeafen: true,
        guild: msg.guild!.id,
        textChannel: msg.channel.id,
        voiceChannel: msg.member.voice.channelID,
      })
    if (player.voiceChannel !== msg.member.voice.channelID)
      return msg.reply('음악을 재생중인 음성채널에 들어가주세요!')
    if (!query) return msg.reply(`${this.client.config.prefix}재생 <곡 제목>`)
    const res = await this.client.music.search(query, msg.author)
    if (res.loadType === 'NO_MATCHES') {
      return msg.reply('검색 결과가 없습니다')
    } else if (res.loadType === 'LOAD_FAILED') {
      return msg.reply(`불러오기 실패: ${res.exception?.message}`)
    } else if (res.loadType === 'PLAYLIST_LOADED') {
      player.queue.add(res.tracks)
      player.connect()
      if (!player.playing) player.play()
      return msg.reply(`${res.tracks.length}곡을 대기열에 추가했어요!`)
    } else if (res.loadType) {
      const tracks = res.tracks.slice(0, 5)
      const embed = new MessageEmbed()
        .setTitle(`곡을 선택해주세요(1-${tracks.length})`)
        .setDescription(tracks.map((track, i) => `${i + 1} - ${track.title}`))
      const m = await msg.reply(embed)
      const emojis = ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '🚫']
      await Promise.all(emojis.map((r) => m.react(r)))
      const num = Array.from(emojis)
      num.pop()
      const result = await m.awaitReactions(
        (reaction: MessageReaction, user: User) =>
          user.id === msg.author.id && emojis.includes(reaction.emoji.name),
        {
          max: 1,
          maxEmojis: 1,
          time: 30000,
        },
      )
      if (!result.first() || result.first()?.emoji.name === emojis.pop())
        return m.edit('취소되었습니다.', { embed: null })
      const idx = num.indexOf(result.first()!.emoji.name)
      player.queue.add(tracks[idx])
      await m.delete()
      await msg.reply(`곡 \`${tracks[idx].title}\`을(를) 재생할게요!`)
      player.connect()
      if (!player.playing) player.play()
    }
  }

  @Command({ name: '정지', aliases: ['stop'] })
  async stop(@Msg() msg: Message) {
    if (!msg.member?.voice.channelID)
      return msg.reply('음성 채널에 들어가주세요')
    const player =
      this.client.music.players.get(msg.guild!.id) ??
      this.client.music.create({
        selfDeafen: true,
        guild: msg.guild!.id,
        textChannel: msg.channel.id,
        voiceChannel: msg.member.voice.channelID,
      })
    if (player.voiceChannel !== msg.member.voice.channelID)
      return msg.reply('음악을 재생중인 음성채널에 들어가주세요!')
    player.destroy()
    await msg.react('✅')
  }

  @Command({ name: 'volume', aliases: ['볼륨'] })
  async volume(@Msg() msg: Message, @Arg() vol: string) {
    if (!msg.member?.voice.channelID)
      return msg.reply('음성 채널에 들어가주세요')
    const player =
      this.client.music.players.get(msg.guild!.id) ??
      this.client.music.create({
        selfDeafen: true,
        guild: msg.guild!.id,
        textChannel: msg.channel.id,
        voiceChannel: msg.member.voice.channelID,
      })
    if (player.voiceChannel !== msg.member.voice.channelID)
      return msg.reply('음악을 재생중인 음성채널에 들어가주세요!')
    let volume = Number(vol)
    if (isNaN(volume) || volume > 1000 || volume < 1) {
      return msg.reply(`${this.client.config.prefix}볼륨 <1-1000>`)
    }
    player.setVolume(volume)
    await msg.react('✅')
  }

  static formatTime(duration: number) {
    const d = new Date(0)
    d.setMilliseconds(duration)
    return d.toISOString().substr(11, 8)
  }

  static createBar(
    total: number,
    current: number,
    size = 15,
    line = '▬',
    slider = '🔘',
  ) {
    if (current > total) {
      const bar = line.repeat(size + 2)
      const percentage = (current / total) * 100
      return [bar, percentage]
    } else {
      const percentage = current / total
      const progress = Math.round(size * percentage)
      const emptyProgress = size - progress
      const progressText = line.repeat(progress).replace(/.$/, slider)
      const emptyProgressText = line.repeat(emptyProgress)
      const bar = progressText + emptyProgressText
      const calculated = percentage * 100
      return [bar, calculated]
    }
  }

  static getNowPlayingEmbed(guild: Guild): MessageEmbed {
    const embed = new MessageEmbed()
    const player = guild.client.music.players.get(guild.id)
    if (!player || !player.queue.current)
      embed.setTitle('재생중인 곡이 없네요!')
    else {
      const t = player.queue.current
      embed.setTitle(
        `${player.playing ? ':arrow_forward:' : ':pause_button:'} ${t.title}`,
      )
      embed.setThumbnail(t.displayThumbnail?.('maxresdefault')!)
      embed.setDescription(
        `${this.formatTime(player.position)} ${
          this.createBar(t.duration!, player.position)[0]
        } -${this.formatTime(t.duration! - player.position)}`,
      )
      embed.addFields([
        {
          name: '볼륨',
          value: player.volume + '%',
          inline: true,
        },
        {
          name: '반복 모드',
          value: player.queueRepeat
            ? '대기열 전체 반복'
            : player.trackRepeat
            ? '현재 곡 반복'
            : '반복 안함',
          inline: true,
        },
      ])
      embed.setFooter(
        (t.requester as any).tag,
        (t.requester as any).displayAvatarURL({ dynamic: true }),
      )
    }
    return embed
  }

  static async initController(msg: Message) {
    if ((msg as any).controllerInitialized) return
    msg.guild!.selectedTrack = 0
    const emojis = ['⏯️', '⏹️', '▶️', '🔄', '➕', '➖']

    ;(msg as any).controllerInitialized = true

    await Promise.all(emojis.map((r) => msg.react(r)))
  }

  @Command({ name: 'np' })
  async nowPlaying(@Msg() msg: Message) {
    if (!msg.guild) return
    const m = await msg.channel.send(Music.getNowPlayingEmbed(msg.guild!))
    if (this.client.controllerMap.get(msg.guild.id))
      await this.client.controllerMap.get(msg.guild.id)?.delete()
    this.client.controllerMap.set(msg.guild.id, m)
    // let loop: NodeJS.Timeout
    // const fn = () => {
    //   m.edit(Music.getNowPlayingEmbed(msg.guild!))
    //     .then(() => {
    //       return setTimeout(fn, 1000)
    //     })
    //     .catch(() => clearInterval(loop))
    // }
    // loop = setTimeout(fn, 1000)
    await Music.initController(m)
  }

  @Listener('messageReactionAdd')
  async messageReactionAdd(reaction: MessageReaction, user: User) {
    if (reaction.message.author.id === user.id) return
    const guild = reaction.message.guild
    if (!guild) return
    const player = this.client.music.players.get(guild.id)
    if (!player) return
    const m = this.client.controllerMap.get(guild.id)
    if (m?.id === reaction.message.id) {
      reaction.users.remove(user)
      if (
        player.voiceChannel !==
        guild.members.cache.get(user.id)?.voice.channelID
      )
        return

      if (reaction.emoji.name === '⏯️') {
        if (!player.paused) player.pause(true)
        else player.pause(false)
      }
      if (reaction.emoji.name === '⏹️') {
        player.destroy()
      }
      if (reaction.emoji.name === '▶️') {
        player.stop()
      }
      if (reaction.emoji.name === '🔄') {
        if (player.queueRepeat) return player.setQueueRepeat(false)
        if (player.trackRepeat) return player.setQueueRepeat(true)
        player.setTrackRepeat(true)
      }
      if (reaction.emoji.name === '➕') {
        if (player.volume > 1000) return
        player.setVolume(player.volume + 5)
      }
      if (reaction.emoji.name === '➖') {
        if (player.volume < 0) return
        player.setVolume(player.volume - 5)
      }
    }
  }

  @Listener('raw')
  raw(payload: any) {
    this.client.music.updateVoiceState(payload)
  }
}
