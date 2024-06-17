const { chat } = require(`${process.cwd()}/utils/chat.js`);
const { mc_error_handler } = require(`${process.cwd()}/error/mc_handler.js`)
const { write_errors } = require(`${process.cwd()}/utils/database.js`)
const { get_player_uuid } = require(`${process.cwd()}/utils/get_player_info.js`)
const fs = require('fs');

async function pay_handler(bot, player_id, amount, type, is_bet, uuid) {
    const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));

    if (is_bet) {
        is_bet = true
        console.log(`[INFO] 轉帳 ${amount} 個 ${type} 給 ${player_id} (是否為下注時的轉帳: ${is_bet} ， UUID 為 ${uuid})`)
    } else {
        is_bet = false
        if (!uuid || uuid == '') uuid = '無'
        console.log(`[INFO] 轉帳 ${amount} 個 ${type} 給 ${player_id} (是否為下注時的轉帳: ${is_bet} ， UUID 為 ${uuid})`)
    }

    await chat(bot, `/pay ${player_id} ${amount}`)

    const success_Promise = bot.awaitMessage(/\[雷夢經濟\]你付了玩家\s+(\w+)\s+([\d,]+(?:\.\d+)?)\s+\$\s+游戲幣/);

    let timeout;
    
    const timeout_Promise = new Promise((resolve) => {
        timeout = setTimeout(() => {
            resolve('timeout');
        }, 10000);
    });

    return new Promise(async resolve => {
        await Promise.race([negative_Promise, no_emerald_Promise, success_Promise, not_same_place_Promise, wait_Promise, timeout_Promise, can_not_send_msg_Promise]).then(async (string) => {
            for (listener of bot.listeners('messagestr')) {
                bot.removeListener('messagestr', listener);
            }

            clearTimeout(timeout);
            
            if (string.startsWith('[雷夢經濟]你付了玩家')) {
                resolve('success')
                
            } else if (string == 'timeout') {
                console.log(`[ERROR] 轉帳 ${amount} 個 ${type} 給 ${player_id} 時發生錯誤: 操作超時`)
                
                if (is_bet) {
                    const uuid = await write_errors(0, amount, config.bet.eodds, 'timeout', await get_player_uuid(player_id), type)
                    await mc_error_handler(bot, 'pay', 'timeout', player_id, '', uuid)
                } else {
                    await mc_error_handler(bot, 'pay', 'timeout', player_id)
                }
                resolve('timeout')
            }
        })
    })
}

module.exports = {
    pay_handler
}