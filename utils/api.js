export const getTokenPrice = async (token) => {
    return fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${token}USDT`)
        .then(res => res.json()).then(data => data.price.slice(0, -6));
}

