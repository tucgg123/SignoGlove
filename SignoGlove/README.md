# SignoGlove

Guante con una placa **micro:bit** que convierte la posición de la mano en frases habladas, pensado para facilitar la comunicación de personas sordas. La página web se conecta al guante por **Web Bluetooth**, muestra la frase en pantalla y la reproduce en voz alta, en español o en inglés.

*A micro:bit glove that turns hand positions into spoken phrases, in Spanish or English, to help Deaf people communicate. [English version of the site](en/index.html).*

![Niña con el guante rojo de SignoGlove](assets/img/guante-signoglove.webp)

## Cómo funciona

1. La micro:bit del guante mide la inclinación de la mano y la envía por Bluetooth (servicio UART) como un número.
2. La página convierte ese número en una de las 5 frases del tema elegido.
3. La frase aparece en pantalla y se reproduce su audio.

| Inclinación recibida | Frase del tema |
| -------------------- | -------------- |
| −25 a 35             | 1              |
| 35 a 75              | 2              |
| −75 a −25            | 3              |
| 115 a 140            | 4              |
| 150 a 180            | 5              |

Hay 5 temas (relaciones personales, trabajo y estudios, salud y bienestar, toma de decisiones y vida cotidiana), con 25 frases por idioma. Sin el guante, también se pueden tocar las frases para escucharlas.

## Tecnologías

HTML, CSS y JavaScript sin frameworks, Web Bluetooth API, micro:bit y GitHub Pages.

## Estructura del proyecto

```
SignoGlove/
├── index.html              # Abre /es o /en según el idioma del navegador
├── es/                     # Sitio en español
│   ├── index.html          # Comunicador (conexión con el guante)
│   ├── about.html          # Sobre el proyecto
│   ├── donate.html         # Donaciones
│   └── team.html           # Integrantes
├── en/                     # Sitio en inglés (mismos archivos)
└── assets/
    ├── css/styles.css      # Estilos compartidos
    ├── js/
    │   ├── glove.js        # Lógica del guante (compartida)
    │   ├── main.js         # Utilidades comunes
    │   └── data/
    │       ├── es.js       # Frases y textos en español
    │       └── en.js       # Frases y textos en inglés
    ├── img/                # Logo e imágenes
    └── audio/
        ├── es/             # 25 audios en español
        └── en/             # 25 audios en inglés
```

### Agregar o cambiar una frase

1. Guarda el audio en `assets/audio/es/` o `assets/audio/en/`, con un nombre en minúsculas, sin tildes ni espacios (por ejemplo, `buenos-dias.mp3`).
2. Edita el tema en `assets/js/data/es.js` o `assets/js/data/en.js`. Cada tema debe tener 5 frases, porque cada una corresponde a una posición de la mano.

## Cómo probarlo

- **En línea:** abre el sitio publicado en GitHub Pages.
- **En tu computador:** abre la carpeta con la extensión Live Server de VS Code. Web Bluetooth necesita `https` o `localhost`.
- **Navegadores compatibles:** Chrome o Edge en computador o Android. Safari, Firefox y los navegadores de iPhone no tienen Web Bluetooth.

## Equipo

- **Profesor:** Mauricio Palacio
- **Estudiantes:** Alexis Arias, Jahn Gonazales, Laura Polo, Santiago Romero y Valeria Sepulveda
