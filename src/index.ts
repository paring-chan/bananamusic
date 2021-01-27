import { CommandClient } from "@pikostudio/command.ts"
import { ShardingManager } from "discord.js"
import Dokdo from "dokdo"

const config = require('../config.json')

declare module 'discord.js' {
    interface Client {
        config: typeof config
        dokdo: Dokdo
    }
}

if (process.env.SHARDING_MANAGER) {
    const client = new CommandClient({
        watch: true,
        owners: 'auto',
        commandHandler: {
            prefix: '!'
        },
        currentDir: __dirname
    })
    client.config = config
    client.loadExtensions('extensions/index')
    client.login(config.token)
} else {
    const manager = new ShardingManager(__filename, {
        execArgv: __filename.endsWith('.ts') ? ['-r', 'ts-node/register'] : [],
        token: config.token
    })
    manager.spawn()
}
