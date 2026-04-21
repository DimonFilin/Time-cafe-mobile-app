# Сборка APK для mobile-app

## Вариант 1: EAS Build (облако, рекомендуется)

Получить APK без локального Android SDK и обхода проблем Windows.

1. Установить EAS CLI и войти в аккаунт Expo (бесплатно):
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. Из папки `mobile-app` запустить сборку:
   ```bash
   cd mobile-app
   eas build --platform android --profile preview
   ```
   Профиль `preview` настроен на вывод **APK** (файл можно сразу скачать и установить).

3. После сборки в консоли появится ссылка на скачивание APK, либо его можно взять в [expo.dev](https://expo.dev) → проект → Builds.

---

## Вариант 2: Локальная сборка (Gradle)

Если на Windows при запуске Gradle появляется ошибка с `Active code page: 1251`, выполните сборку в среде, где в stdout не попадает этот текст (например, WSL или PowerShell с отключённым выводом кодовой страницы).

### Через WSL (Linux в Windows)

```bash
cd /mnt/c/My\ files/колледж/Diplom/time-caffe/mobile-app
npx expo prebuild --clean
cd android
./gradlew assembleRelease
```

APK будет здесь: `android/app/build/outputs/apk/release/app-release.apk`.

### Через PowerShell (попытка обойти code page)

```powershell
cd "C:\My files\колледж\Diplom\time-caffe\mobile-app\android"
$env:CI = "1"
.\gradlew.bat assembleRelease
```

Если ошибка сохраняется, используйте Вариант 1 (EAS Build).

---

## Вариант 3: Debug APK (быстрая проверка)

Для теста можно собрать отладочный APK (подписан debug-ключом):

```bash
cd mobile-app/android
./gradlew assembleDebug
```

Файл: `android/app/build/outputs/apk/debug/app-debug.apk`. Устанавливается на устройство так же, но для публичной раздачи лучше использовать release или EAS.
