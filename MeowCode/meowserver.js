const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = 3001;

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Разрешаем CORS для всех запросов
app.use(cors());

// Парсинг URL-encoded данных
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Прокси-эндпоинт
app.post('/proxy/oauth', async (req, res) => {
    try {
        const payload = new URLSearchParams({
            scope: "GIGACHAT_API_PERS"
        }).toString();

        const config = {
            method: 'post',
            url: 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'RqUID': uuidv4(),
                'Authorization': 'Basic MTUzMDM2N2EtZTBkMS00MmUyLTljYWUtNTdmYTg4MzhlMjc2OjZjMDFiMjE2LTAzNWMtNGM4Mi04MWMyLTBmNjI2OTllZGRlOQ=='
                //1530367a-e0d1-42e2-9cae-57fa8838e276
                //6c01b216-035c-4c82-81c2-0f62699edde9
            },
            data: payload
        };

        const response = await axios.request(config);
        res.json(response.data);
    } catch (error) {
        res.status(error.response.status || 500).json({
            error: error.message,
            details: error.response.data
        });
    }
});

app.post('/proxy/gpt', async (req, res) => {
    const { GigaChatKey, currentData, forecastData } = req.body;

    if (!GigaChatKey || !currentData || !forecastData) {
        return res.status(400).json({ error: 'GigaChatKey and currentData/forecastData are required' });
    }

    const date = new Date((forecastData.list[0].dt + forecastData.city.timezone) * 1000);
    const day = date.getDate().toString().padStart(2, '0');
    const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    const month = months[date.getMonth()];
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`; 


    const url = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";

    const headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GigaChatKey}`
    };

    const body = {
        "model": "GigaChat",
        "messages": [
            {
                "role": "system",
                "content": "Ты — помощник, который дает рекомендации по активностям на основе текущих и прогнозируемых погодных условий. Учитывай температуру, погодные условия, скорость ветра, влажность, местоположение, дату и время. Рекомендации должны быть краткими, информативными."
            },
            {
                "role": "user",
                "content": `Сейчас:
    - Температура: ${currentData.main.temp}°C,
    - Погодные условия: ${currentData.weather[0].description},
    - Скорость ветра: ${currentData.wind.speed.toFixed(1)} м/с,
    - Влажность: ${currentData.main.humidity}%,
    - Местоположение: ${currentData.name},
    - Текущее время: ${time},
    - Дата: ${day} ${month}.
    
    Через 3 часа:
    - Температура: ${forecastData.list[1].main.temp}°C,
    - Погодные условия: ${forecastData.list[1].weather[0].description}.
    
    Предложи, чем можно заняться, учитывая эти условия. Ответ должен быть кратким (3-4 предложения) и не содержать обоснований или извинений. В твоём ответе ты не должен повторять температуру или ветер. Желательно, чтобы ты упомянул особенности города или места откуда идёт запрос. Учитывай дату и время в текущем регионе.`
            }
        ],
        "stream": false,
        "update_interval": 0
    };

    try {
        const response = await axios.post(url, body, { headers });
        res.json(response.data);
    } catch (error) {
        res.status(error.response.status || 500).json({
            error:   error.message,
            details: error.response.data
        });
    }
});



app.listen(port, () => {
    console.log(`Proxy server running at http://localhost:${port}`);
});