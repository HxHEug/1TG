// Импорт Firebase SDK
// В реальном проекте используйте npm install firebase
// Для простоты в index.html можно добавить <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
// и <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js"></script>

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
    // ВСТАВЬТЕ СВОЮ КОНФИГУРАЦИЮ ИЗ ШАГА 1.2
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    // ... остальное
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Проверка инициализации Telegram WebApp
if (window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.MainButton.setText("Выбрать Место").show();
    
    // Используем цветовую схему Telegram
    document.body.style.backgroundColor = tg.themeParams.bg_color;
    document.body.style.color = tg.themeParams.text_color;
    
    // Пример использования MainButton (кнопки внизу)
    tg.MainButton.onClick(() => {
        // Здесь можно реализовать логику подтверждения после выбора места
        // Например: tg.MainButton.setText("Подтвердить бронь");
    });
} else {
    document.getElementById('message').textContent = "Это приложение должно быть запущено внутри Telegram Mini App.";
}

let selectedDeskId = null;

// Обработчики выбора места
document.querySelectorAll('.desk-btn').forEach(button => {
    button.addEventListener('click', () => {
        selectedDeskId = button.dataset.id;
        document.getElementById('selected-desk').textContent = selectedDeskId;
        document.getElementById('booking-details').style.display = 'block';
        document.getElementById('message').textContent = `Вы выбрали место ${selectedDeskId}.`;
        
        // Установка MainButton для бронирования
        window.Telegram.WebApp.MainButton.setText(`Забронировать ${selectedDeskId}`).show();
        window.Telegram.WebApp.MainButton.onClick(handleBooking);
    });
});

// Функция бронирования
async function handleBooking() {
    if (!selectedDeskId) {
        window.Telegram.WebApp.showAlert('Сначала выберите рабочее место.');
        return;
    }
    
    const dateInput = document.getElementById('booking-date');
    const bookingDate = dateInput.value;
    
    if (!bookingDate) {
        window.Telegram.WebApp.showAlert('Выберите дату бронирования.');
        return;
    }

    try {
        window.Telegram.WebApp.MainButton.showLoader();

        // Получаем данные пользователя из WebApp SDK
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        const bookingData = {
            deskId: selectedDeskId,
            date: bookingDate,
            userId: user ? user.id : 'unknown_telegram_user',
            username: user ? user.username : 'N/A',
            bookedAt: new Date(),
        };

        // Отправка данных в Firestore (коллекция 'bookings')
        // В более продвинутой версии здесь должен быть запрос к вашему Cyclic API,
        // который уже сам проверяет занятость и записывает в базу.
        const docRef = await addDoc(collection(db, "bookings"), bookingData);
        
        // Сообщаем пользователю об успехе
        window.Telegram.WebApp.showAlert(`✅ Место ${selectedDeskId} забронировано на ${bookingDate}!`);
        
        // Опционально: закрываем приложение и отправляем данные боту
        window.Telegram.WebApp.sendData(JSON.stringify({
            action: 'booked',
            deskId: selectedDeskId,
            date: bookingDate
        }));
        
        // window.Telegram.WebApp.close(); // Закрываем, если задача выполнена
        
    } catch (e) {
        console.error("Ошибка при добавлении документа: ", e);
        window.Telegram.WebApp.showAlert('❌ Ошибка при бронировании. Попробуйте снова.');
    } finally {
        window.Telegram.WebApp.MainButton.hideLoader();
    }
}

// Загрузка существующих бронирований для отображения занятости (опционально)
// Вы можете написать функцию, которая загружает бронирования из Firestore 
// и помечает кнопки рабочих мест как "Занято".
// async function loadBookings() { ... }