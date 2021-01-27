import { CommandClient } from "@pikostudio/command.ts"
import { Collection } from "discord.js"
import { Message } from "discord.js"
import { ShardingManager } from "discord.js"
import Dokdo from "dokdo"
import { Manager } from 'erela.js'

const config = require('../config.json')

declare module 'discord.js' {
    interface Client {
        config: typeof config
        dokdo: Dokdo
        music: Manager
        controllerMap: Collection<string, Message>
    }
}

if (process.env.SHARDING_MANAGER) {
    const client = new CommandClient({
        watch: true,
        owners: 'auto',
        commandHandler: {
            prefix: config.prefix
        },
        currentDir: __dirname
    }, {
        restTimeOffset: 0
    })
    client.controllerMap = new Collection()

    client.music = new Manager({
        send: (id, payload) => {
            const guild = client.guilds.cache.get(id)
            if (guild) guild.shard.send(payload)
        }
    })

    client.music.on('nodeConnect', node => {
        console.log(`Node ${node.options.host}:${node.options.port} connected.`)
    })

    client.music.on('nodeError', (node, error) => {
        console.log(`Node ${node.options.host}:${node.options.port} encounted an error: ${error.message}`)
    })

    client.music.on('nodeRaw', (payload) => {
        console.log(payload)
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
