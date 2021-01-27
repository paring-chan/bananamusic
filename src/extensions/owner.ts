import { Command, Extension, Msg } from "@pikostudio/command.ts";
import { Message } from "discord.js";

export default class extends Extension {
    @Command({name: 'dokdo', aliases: ['dok']})
    async dokdo(@Msg() msg: Message) {
        return this.client.dokdo.run(msg)
    }
}