import { Extension, Listener } from "@pikostudio/command.ts";
import Dokdo from "dokdo";

export default class extends Extension {
    @Listener('ready')
    async ready() {
        console.log('ready')

        this.client.dokdo = new Dokdo(this.client, {
            noPerm(msg) {
                msg.react('❌')
            },
            prefix: '!',
        })
    }
}

export {default as Owner} from './owner'
