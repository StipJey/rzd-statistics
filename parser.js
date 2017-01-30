var request = require("request").defaults({jar: true, baseUrl: "https://pass.rzd.ru/timetable/public/ru?"});

function createURI(object) {
    let output = '';
    Object.keys(object).forEach((key, i, arr) => {
        output += key + '=' + object[key];
        if (i !== arr.length - 1) {
            output += '&';
        }
    });
    return output;
}

function getRid(date) {
    return new Promise(function(resolve, reject) {
        request({
            uri: createURI({
                'STRUCTURE_ID': 735,
                'layer_id': 5371,
                'dir': 0,
                'tfl': 3,
                'checkSeats': 1,
                'code0': 2004000, //СПБ
                'dt0': date,
                'code1': 2010294, //Фурманов
            }),
            method: "GET",
            timeout: 10000,
            followRedirect: true,
            maxRedirects: 10
        }, function(error, response, body) {
            if (error) reject(error);
            resolve({rid: JSON.parse(body).rid, date: date});
        });
    });
}

function getTrainList({rid, date}) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            request({
                uri: createURI({
                    'STRUCTURE_ID': 735,
                    'layer_id': 5371,
                    'dir': 0,
                    'tfl': 3,
                    'checkSeats': 1,
                    'code0': 2004000, //СПБ
                    'dt0': date,
                    'code1': 2010294, //Фурманов
                    'rid': rid,
                }),
                method: "GET",
                timeout: 10000,
                followRedirect: true,
                maxRedirects: 10
            }, function(error, response, body) {
                if (error) reject(error);
                resolve(JSON.parse(body).tp[0].list);
            });
        }, 300);
    })
}

function singlingCost(trains) {
    let minimalCost = null;
    trains.forEach(train => {
        train.cars.forEach(car => {
        if (car.type === 'Плац') {
        minimalCost = (!minimalCost || car.tariff < minimalCost) ? car.tariff : minimalCost;
    }
})
});
    return minimalCost;
}



function getMinimalCostByDate(date) {
    return new Promise((resolve, reject) =>
    {
        getRid(date)
            .then(getTrainList)
            .then(singlingCost)
            .then(resolve)
            .catch(reject);
    })
}

const dates = [
    '01.02.2017',
    '02.02.2017',
    '03.02.2017',
    '04.02.2017',
    '05.02.2017',
    '06.02.2017',
    '07.02.2017',
    '08.02.2017',
    '09.02.2017',
    '10.02.2017',
];

let chain = Promise.resolve();

let results = [];

// в цикле добавляем задачи в цепочку
dates.forEach(function(date) {
    chain = chain
        .then(() => getMinimalCostByDate(date))
        .then((result) => {
            results.push(result);
        });
});

// в конце — выводим результаты
chain.then(() => {
    console.log(results);
});
