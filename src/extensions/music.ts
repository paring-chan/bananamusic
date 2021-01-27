import { Arg, Command, Extension, Listener, Msg } from '@pikostudio/command.ts'
import { MessageEmbed } from 'discord.js'
import { Message } from 'discord.js'
import { rawListeners } from 'process'

export default class extends Extension {
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
    if (player.voiceChannel !== msg.member.voice.channelID) return msg.reply('')
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
      const tracks = res.tracks.slice(0, 10)
      const embed = new MessageEmbed()
        .setTitle(`곡을 선택해주세요(1-${tracks.length}/취소)`)
        .setDescription(tracks.map((track, i) => `${i + 1} - ${track.title}`))
      await msg.reply(embed)
    }
  }

  @Listener('raw')
  raw(payload: any) {
    this.client.music.updateVoiceState(payload)
  }
}
