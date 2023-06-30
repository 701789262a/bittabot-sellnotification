binanceNode = require('binance-api-node')["default"]
const { Telegraf } = require('telegraf')
var rusDiff = require('rus-diff').rusDiff

// Loading user authorized users.
const users = require('./users.json')

// Loading key file.
const keys = require('./keys.json')

// Logging with keys.
console.log(keys.apikey, keys.privatekey)
const api = binanceNode({ apiKey: keys.apikey, apiSecret: keys.privatekey });

// Associate telegraf with bot.
const bot = new Telegraf('6041934243:AAEc7KQYPlE__yhsEWEJG3akKZSG_sQEHkc')
bot.start((context) => {
    console.log('Servizio avviato...')

    console.log(context)
})

// Sleep function
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

bot.on('text', context => {
    console.log(context)
    // If user is not into whitelist, rickroll 'em
    if (!users.includes(context.update.message.chat.id)) {
        context.reply('Check this out! https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    }

})

bot.launch()

check_order_periodically()

async function check_order_periodically() {

    // Storeing the active trade at startup.
    var open_orders = await api.openOrders()
    console.log(open_orders)

    while (true) {

        // Each 10 seconds a request to get every active order is sent.
        var partial_open_orders = await api.openOrders()
        console.log(partial_open_orders)
        if (JSON.stringify(partial_open_orders) != JSON.stringify(open_orders)) {
            // Difference between order list is found.
            //var difference = open_orders.filter(x => partial_open_orders.indexOf(x) === -1);
            var difference = rusDiff(partial_open_orders, open_orders)
            console.log("diff", difference)
            // Set open_orders to partial_open_orders.
            open_orders = partial_open_orders

            var order = await api.getOrder({ symbol: `${difference.$set[0].symbol}`, orderId: `${difference.$set[0].orderId}` })

            // Notify users of change.
            if (['CANCELED', 'FILLED', 'PARTIALLY_FILLED'].includes(String(order.status))) {

                try {
                    users.forEach(user => {
                        bot.telegram.sendMessage(user, `Order ${difference.$set[0].side} ${difference.$set[0].symbol} ${difference.$set[0].origQty}. Status: ${order.status}`)
                    })
                } catch (exceptionVar) {
                    console.log("errore")
                }

            }

            console.log("Retrying in 3s...")
        } else {
            console.log("No difference found! Retrying in 3s...")
        }

        // Wait 10 seconds.
        await sleep(3000)
    }
}

