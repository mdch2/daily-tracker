# Compatibilidad Android

Decisión del 16 de octubre de 2026: Daily Tracker admite **Android 11 (API Level 30) o posterior**. Es un requisito del producto, más restrictivo que el mínimo técnico de React Native/Expo.

## Configuración vigente

| Propiedad           | Valor  | Motivo                                                                                                |
| ------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| `minSdkVersion`     | **30** | Excluir Android 10 y anteriores de las compilaciones propias.                                         |
| `compileSdkVersion` | **37** | Versión de compilación compatible con Expo SDK 58 y React Native 0.88 instalados.                     |
| `targetSdkVersion`  | **36** | Destino de Expo 58; satisface el requisito vigente de Google Play para nuevas apps y actualizaciones. |

`app.json` es la fuente de configuración. El plugin `expo-build-properties` (~58.0.11), instalado con pnpm mediante Expo, aplica estas propiedades durante Prebuild. No se fijan manualmente versiones de Gradle, AGP, Kotlin, NDK ni Build Tools: se conservan las compatibles con Expo.

El mínimo de instalación y el nivel de API de destino cumplen funciones distintas: apuntar a API 36 no exige Android 16 al usuario; la instalación se permite desde API 30.
Al actualizar Expo, volver a contrastar `compileSdkVersion` y `targetSdkVersion` con su matriz y la política vigente de Google Play. No reducir el mínimo del producto ni forzar dependencias incompatibles.

## Aplicación al proyecto nativo

La introspección de Expo y un prebuild Android real produjeron:

```properties
android.minSdkVersion=30
android.compileSdkVersion=37
android.targetSdkVersion=36
```

El plugin de settings de Expo transforma esas propiedades en las versiones `minSdk`, `compileSdk` y `targetSdk` del catálogo `expoLibs`. `expo-root-project` las expone como propiedades del proyecto raíz y `android/app/build.gradle` las consume:

```groovy
compileSdk rootProject.ext.compileSdkVersion
defaultConfig {
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
}
```

El prebuild de verificación se ejecutó en un directorio temporal, con las mismas dependencias y plugins y un `android.package` de prueba únicamente en esa copia. No se eligió un identificador comercial ni se generó `android/` en el repositorio.
`android/` sigue ignorado: las compilaciones propias deben generar el proyecto nativo desde la configuración vigente. En EAS, Prebuild se ejecuta cuando no se proporciona un proyecto nativo existente. Si se conserva uno localmente, hay que actualizarlo antes de compilar; cambiar `app.json` no modifica un APK ya construido.

Expo Go utiliza su propio binario y manifiesto. No sirve para comprobar el mínimo Android de Daily Tracker ni sustituye una development build o release propia.

## Compatibilidad de dependencias y evidencia

- `pnpm exec expo install --check --pnpm`: dependencias compatibles con el SDK instalado, incluyendo `expo-build-properties`. Se conservan las excepciones de Jest ya justificadas en ADR-001.
- React Native 0.88 declara mínimo API 24, compilación 37 y destino 36; elevar el mínimo de la app a 30 respeta ese límite técnico.
- Se revisaron los Gradle de `react-native-screens`, `react-native-safe-area-context` y los módulos Expo instalados. Consumen la configuración compartida; no se detectó un requisito declarado incompatible con API 30 en esta revisión.
- `pnpm exec expo config --type introspect --json`: confirmó las tres propiedades nativas, sin depender del identificador temporal.
- Prebuild Android con `--no-install`: correcto; se inspeccionaron `gradle.properties`, el plugin de settings y el Gradle de la aplicación.
- La tarea `:app:processReleaseMainManifest` se intentó en el proyecto temporal, pero el wrapper no pudo iniciarse: `JAVA_HOME` no está definido y no existe `java` en PATH. Tampoco hay Android SDK configurado. **No se ha compilado un APK/AAB ni verificado el manifiesto fusionado o la instalación en un dispositivo.**

La revisión de fuentes y la matriz de Expo no sustituyen la resolución de AAR ni una compilación completa. Esas comprobaciones quedan pendientes del entorno Android.

## Verificación con herramientas Android disponibles

1. Configurar un JDK compatible con el Gradle/AGP de Expo 58, Android SDK Platform 37 y las Build Tools compatibles (37.0.0 en el catálogo instalado). Configurar `JAVA_HOME` y la ubicación del Android SDK.
2. Definir el `android.package` real antes de generar una build destinada a distribución; esa decisión sigue pendiente.
3. Generar/actualizar el proyecto nativo:

   ```powershell
   pnpm exec expo prebuild --platform android --no-install
   .\android\gradlew.bat -p android :app:processReleaseMainManifest --no-daemon
   .\android\gradlew.bat -p android :app:assembleDebug --no-daemon
   ```

4. Inspeccionar el manifiesto fusionado y el APK: `minSdkVersion=30` y `targetSdkVersion=36`; comprobar `compileSdkVersion=37` en la configuración Gradle efectiva. Verificar instalación y ejecución en Android 11 y una versión reciente, y rechazo de instalación por debajo de API 30.

Estos comandos son los pasos de verificación pendientes; no se presentan como ejecutados correctamente en este entorno. La publicación requiere además signing y las verificaciones de Play Console correspondientes.

## Fuentes oficiales consultadas

- [Matriz de Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/): compilación API 37 y destino API 36.
- [expo-build-properties para SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/build-properties/): versión y aplicación durante Prebuild.
- [Requisitos de API de Google Play](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en): desde el 31 de agosto de 2026, nuevas apps y actualizaciones móviles deben apuntar al menos a API 36.
