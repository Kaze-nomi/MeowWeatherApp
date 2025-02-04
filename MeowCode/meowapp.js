const appWeatherApp = (containerId, params = {}) => {
    let historyData;
    let historyChart;
    let latitude = 55.7512;
    let longitude = 37.6184;

    // -----------------------------
    // 1. Настройки для погоды
    // -----------------------------
    const API_KEY = '5b4600a0cdd0d6e1d0f075e40c77c1dc'; // API ключ OpenWeatherMap
    const DEFAULT_CITY = 'Москва';  // Начальный город

    // -----------------------------
    // 2. Функции для погоды
    // -----------------------------
    async function fetchCurrentWeather(city) {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&lang=ru&units=metric&appid=${API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Ошибка при запросе текущей погоды: ' + response.statusText);
        }
        return response.json();
    }

    async function fetchHourlyForecast(city) {
        const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&lang=ru&units=metric&appid=${API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Ошибка при запросе прогноза: ' + response.statusText);
        }
        return response.json();
    }

    function updateUI(currentData, forecastData) {
        // Температура, описание
        const temperature = Math.round(currentData.main.temp);
        document.getElementById('tempValue').textContent = (temperature > 0 ? '+' : '') + temperature + "°C";
        const conditions = currentData.weather[0].description;
        document.getElementById('weatherConditionsText').textContent = conditions.charAt(0).toUpperCase() + conditions.slice(1);

        document.getElementById('activity-recommendations').style.display = "none";
        document.getElementById('loading').style.display = "block";
        document.getElementById('loading').style = "flex";

        // Устанавливаем GIF по погоде
        const weatherID = currentData.weather[0].id;
        const iconSuffix = currentData.weather[0].icon.endsWith('d') ? 'day' : 'night';
        const weatherGIF = document.getElementById('weather-icon');
        let svgFile = 'not-available.svg';

        switch (true) {
            // Гроза (200-232)
            case (weatherID >= 200 && weatherID <= 232):
                svgFile = `thunderstorms${iconSuffix === 'day' ? '-day' : '-night'}.svg`;
                break;

            // Морось (300-321)
            case (weatherID >= 300 && weatherID <= 321):
                svgFile = 'drizzle.svg';
                break;

            // Дождь (500-531)
            case (weatherID >= 500 && weatherID <= 531):
                if (weatherID === 511) svgFile = 'sleet.svg'; // Ледяной дождь
                else svgFile = `rain${iconSuffix === 'day' ? '' : '-night'}.svg`;
                break;

            // Снег (600-622)
            case (weatherID >= 600 && weatherID <= 622):
                svgFile = `snow${iconSuffix === 'day' ? '' : '-night'}.svg`;
                break;

            // Атмосферные явления (701-781)
            case (weatherID >= 701 && weatherID <= 781):
                switch (weatherID) {
                    case 701: svgFile = `mist${iconSuffix === 'day' ? '-day' : '-night'}.svg`; break;
                    case 711: svgFile = 'smoke.svg'; break;
                    case 721: svgFile = `haze${iconSuffix === 'day' ? '-day' : '-night'}.svg`; break;
                    case 731:
                    case 761: svgFile = 'dust.svg'; break;
                    case 741: svgFile = `fog${iconSuffix === 'day' ? '-day' : '-night'}.svg`; break;
                    case 751: svgFile = 'sand.svg'; break;
                    case 762: svgFile = 'falling-stars.svg'; break;
                    case 771: svgFile = 'wind.svg'; break;
                    case 781: svgFile = 'tornado.svg'; break;
                    default: svgFile = 'dust.svg';
                }
                break;

            // Ясно (800)
            case (weatherID === 800):
                svgFile = iconSuffix === 'day' ? 'clear-day.svg' : 'starry-night.svg';
                break;

            // Облака (801-804)
            case (weatherID >= 801 && weatherID <= 804):
                const cloudType = [
                    'partly-cloudy',    // 801
                    'partly-cloudy',    // 802
                    'cloudy',           // 803
                    'overcast'          // 804
                ][weatherID - 801];
                svgFile = `${cloudType}${iconSuffix === 'day' ? '-day' : '-night'}.svg`;
                break;
            default:
                svgFile = 'not-available.svg';
        }

        weatherGIF.src = `img/${svgFile}`;

        // Дополнительно: ветер, влажность
        document.getElementById('windValue').textContent = currentData.wind.speed.toFixed(1);
        document.getElementById('humidityValue').textContent = currentData.main.humidity;

        // Рекомендации
        getRecommendation(currentData, forecastData);

        // Краткосрочный прогноз (берём первые 8 записей)
        const list = forecastData.list.slice(0, 8);
        const forecastContainer = document.getElementById('short-term-forecast');
        forecastContainer.innerHTML = ''; // Очищаем контейнер

        list.forEach(item => {
            const date = new Date((item.dt + forecastData.city.timezone) * 1000);
            const hours = date.getUTCHours().toString().padStart(2, '0');
            const minutes = date.getUTCMinutes().toString().padStart(2, '0');
            const time = `${hours}:${minutes}`;    
            const temp = (Math.round(item.main.temp) > 0 ? '+' : '') + Math.round(item.main.temp);
            const icon = item.weather[0].icon;
            const desc = item.weather[0].description;

            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-day-item';
            forecastItem.innerHTML = `
                <div class="forecast-date">${time}</div>
                <div class="forecast-icon">
                    <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${desc}" width="40">
                </div>
                <div class="forecast-temp">${temp}°C</div>
            `;
            forecastContainer.appendChild(forecastItem);
        });

        const weekForecastList = forecastData.list.filter((item, i) => i % 8 === 0).slice(0, 5);
        const weekForecastContainer = document.getElementById('long-term-forecast');
        weekForecastContainer.innerHTML = ''; // Очищаем контейнер

        weekForecastList.forEach(item => {
            const date = new Date((item.dt + forecastData.city.timezone) * 1000).toLocaleString('ru', { weekday: 'short', day: 'numeric', month: 'long' }).replace(/^./, match => match.toUpperCase());
            const temperature = (Math.round(item.main.temp) > 0 ? '+' : '') + Math.round(item.main.temp);
            const weatherIcon = item.weather[0].icon;
            const weatherDesc = item.weather[0].description;

            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-week-item';
            forecastItem.innerHTML = `
                <div class="forecast-date">${date}</div>
                <div class="forecast-icon">
                    <img src="https://openweathermap.org/img/wn/${weatherIcon}.png" alt="${weatherDesc}" width="40">
                </div>
                <div class="forecast-temp">${temperature}°C</div>
            `;
            weekForecastContainer.appendChild(forecastItem);
        });

        longitude = currentData.coord.lon;
        latitude = currentData.coord.lat;
    }

    async function loadWeatherData(city) {
        try {
            const [currentData, forecastData] = await Promise.all([
                fetchCurrentWeather(city),
                fetchHourlyForecast(city)
            ]);
            fetchHistoricalData();
            updateUI(currentData, forecastData);
        } catch (err) {
            console.error(err);
            alert('Не удалось загрузить погоду. Проверьте название города или API-ключ.');
        }
    }

    // -----------------------------
    // 3. Логика выбора фона (изображение)
    // -----------------------------

    // Обработчик клика на file-input-wrapper
    document.querySelector('.file-input-wrapper').addEventListener('click', function () {
        // Программно вызываем клик на input
        document.getElementById('bgImageInput').click();
    });

        // Обработчик сброса фона
    document.getElementById('resetBgButton').addEventListener('click', function() {
        document.querySelector('.weather-app').style.background = 'rgba(255, 255, 255, 0.15)';
        document.querySelector('.weather-app').style.backgroundImage = 'none';  
        document.getElementById('bgImageInput').value = '';
        localStorage.removeItem('bgImage');
        document.body.classList.remove('light-theme');
    });

    // Обработчик изменения файла
    document.getElementById('bgImageInput').addEventListener('change', function (e) {
        const file = e.target.files[0]; // Получаем выбранный файл
        if (file) {
            // Проверяем тип файла (должен быть изображением)
            if (!file.type.startsWith('image/')) {
                alert('Пожалуйста, выберите изображение.');
                return;
            }

            const reader = new FileReader(); // Создаем FileReader
            reader.readAsDataURL(file); // Читаем файл как Data URL
            reader.onload = function (e) {
                // Устанавливаем фоновое изображение
                document.querySelector('.weather-app').style.background = `url(${e.target.result})`;
                document.querySelector('.weather-app').style.backgroundSize = 'cover'; // Убедимся, что изображение покрывает весь экран
                localStorage.setItem('bgImage', e.target.result);
                updateContrast(e.target.result);
            };
            reader.onerror = function () {
                alert('Ошибка при чтении файла.');
            };
        }
    });

    function updateContrast(imageUrl) {
        const img = new Image();
        img.src = imageUrl;

        if (!imageUrl) {
            document.body.classList.remove('light-theme');
        }

        img.onload = function () {
            // Анализ средней яркости изображения
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 10, 10); // Анализируем 10 пикселей для большей точности
            const pixel = ctx.getImageData(0, 0, 1, 1).data;
            const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;

            // Если фон светлый (яркость > 128) - меняем цветовую схему
            if (brightness > 128) {
                document.body.classList.add('light-theme');
            } else {
                document.body.classList.remove('light-theme');
            }
        };
    }

    function restoreBackgroundImage() {
        const savedImageUrl = localStorage.getItem('bgImage'); // Получаем сохраненный URL изображения
        if (savedImageUrl) {
            document.querySelector('.weather-app').style.backgroundImage = `url(${savedImageUrl})`; // Восстанавливаем фон
            document.querySelector('.weather-app').style.backgroundSize = 'cover'; // Убедимся, что изображение покрывает весь экран
            updateContrast(savedImageUrl);
        }
    }

    // -----------------------------
    // 4. Обработчики и инициализация
    // -----------------------------
    document.getElementById('regionText').addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            const newCity = this.value.trim();
            if (newCity) {
                loadWeatherData(newCity);
            }
        }
    });

    document.querySelectorAll('.forecast-buttons button').forEach(button => {
        if (!button.classList.contains('custom-file-input')) {
            button.addEventListener('click', function () {
                document.querySelectorAll('.forecast-buttons button').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        }
    });

    document.getElementById('long-term-button').addEventListener('click', () => {
        const forecastLongContainer = document.getElementById('long-forecast-container');
        const forecastShortContainer = document.getElementById('short-forecast-container');
        const chartContainer = document.getElementById('chart-container');
        if (forecastLongContainer.style.display !== 'block') {
            forecastShortContainer.style.display = 'none';
            chartContainer.style.display = 'none';
            forecastLongContainer.style.display = 'block';
        }
    });

    document.getElementById('historical-data-button').addEventListener('click', () => {
        const forecastLongContainer = document.getElementById('long-forecast-container');
        const forecastShortContainer = document.getElementById('short-forecast-container');
        const chartContainer = document.getElementById('chart-container');
        if (chartContainer.style.display !== 'block') {
            forecastLongContainer.style.display = 'none';
            forecastShortContainer.style.display = 'none';
            chartContainer.style.display = 'block';
            chartContainer.style.background = 'rgba(255, 255, 255, 0)';
            renderChart(historyData);
        }
    });

    document.getElementById('short-term-button').addEventListener('click', () => {
        const forecastLongContainer = document.getElementById('long-forecast-container');
        const forecastShortContainer = document.getElementById('short-forecast-container');
        const chartContainer = document.getElementById('chart-container');
        if (forecastShortContainer.style.display !== 'block') {
            forecastLongContainer.style.display = 'none';
            chartContainer.style.display = 'none';
            forecastShortContainer.style.display = 'block';
        }
    });


    async function fetchHistoricalData() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate() - 1).padStart(2, '0');

        const startYear = year - 40;
        const start_date = `${startYear}-${month}-${day}`;
        const end_date = `${year}-${month}-${day}`;

        const url = `https://archive-api.open-meteo.com/v1/era5?latitude=${latitude}&longitude=${longitude}`
            + `&start_date=${start_date}&end_date=${end_date}`
            + `&daily=temperature_2m_min,temperature_2m_max`
            + `&timezone=auto`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Ошибка при запросе исторических данных: ' + response.statusText);
            }
            const data = await response.json();
            historyData = data.daily;
        } catch (error) {
            console.error(error);
            alert('Не удалось получить исторические данные.');
        }
    }

    function renderChart(dailyData) {
          const time = dailyData.time;
          const temperature_2m_max = dailyData.temperature_2m_max;
          const temperature_2m_min = dailyData.temperature_2m_min;

          const filteredTime = time.filter((_, index) => index % 10 === 0);
          const filteredMinTemps = temperature_2m_min.filter((_, index) => index % 10 === 0);
          const filteredMaxTemps = temperature_2m_max.filter((_, index) => index % 10 === 0);

        const labels = filteredTime;
        const minTemps = filteredMinTemps;
        const maxTemps = filteredMaxTemps;

        if (historyChart) {
            historyChart.destroy();
        }

        const ctx = document.getElementById('historyChart').getContext('2d');
        historyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Мин. температура',
                        data: minTemps,
                        borderColor: 'blue',
                        backgroundColor: 'blue',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Макс. температура',
                        data: maxTemps,
                        borderColor: 'red',
                        backgroundColor: 'red',
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            maxTicksLimit: 8,
                            color: 'white',
                        },
                        title:
                        {
                            display: true,
                            color: 'white',
                            text: 'Дата'
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            color: 'white',
                            text: '°C'
                        },
                        ticks: {
                            color: 'white'
                        },
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'white'
                        }
                    }
                }
            }
        });
    }

    async function getRecommendation(currentData, forecastData) {
        let GigaChatKey = '';
        try {
            const response = await axios.post('http://localhost:3001/proxy/oauth');
            GigaChatKey = response.data.access_token;
        } catch (error) {
            console.error('Error:', error.response.data || error.message);
        }

        try {
            const response = await axios.post('http://localhost:3001/proxy/gpt', {
                GigaChatKey,
                currentData,
                forecastData
            });
            document.getElementById('loading').style.display = "none";
            document.getElementById('activity-recommendations').style.display = "block";
            document.getElementById('activity-recommendations').textContent = await response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error:', error.response ? error.response.data : error.message);
        }
    }

    // Инициализация
    try {
        restoreBackgroundImage();
        loadWeatherData(DEFAULT_CITY);
    } catch (error) {   
        console.error("Ошибка при загрузке страницы:", error);
    }
};