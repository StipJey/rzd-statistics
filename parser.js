var request = require("request").defaults({jar: true, baseUrl: "https://pass.rzd.ru/timetable/public/ru?"});

var MongoClient = require('mongodb').MongoClient, assert = require('assert');

MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {

	let chain = Promise.resolve();
	let date = '01.02.2017';

	for (let i = 0; i < 50; i++) {
		chain = chain
			.then(() => getMinimalCostByDate(date))
			.then((result) => {
				pushToDb(db, date, result);
			}).then(() => {
				date = getNextDay(date);
			});
	}

	// в конце — выводим результаты
	chain.then(() => {
		console.log('Успех');
		db.close();
	});


});

function pushToDb(db, date, cost) {
	return new Promise((resolve, reject) => {
		db.collection('test').insertOne({[date.split('.').join('_')]: cost}, (err, res) => {
			if (err) reject(err);
			resolve(res);
		})
	})
}

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
				if (error) return reject(error);
				const result = JSON.parse(body);
				if (!result.tp || !result.tp[0] || !result.tp[0].list) {
					console.log(result);
					return resolve(null);
				}
				resolve(result.tp[0].list);
			});
		}, 300);
	})
}

function singlingCost(trains) {
	if (!trains) return null;
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
	return new Promise((resolve, reject) => {
		getRid(date)
			.then(getTrainList)
			.then(singlingCost)
			.then(resolve)
			.catch(reject);
	})
}

function getNextDay(date) {
	var dc = date.split('.')
	var d = new Date(+dc[2], +dc[1] - 1, +dc[0]);
	d.setDate(d.getDate() + 1);

	function normalize(number) {
		number = number.toString()
		return number.length === 1 ? '0' + number : number
	}

	return normalize(d.getDate()) + '.' + normalize(d.getMonth() + 1) + '.' + d.getFullYear();
}

let chain = Promise.resolve();

let results = [];

function getCosts() {
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
}