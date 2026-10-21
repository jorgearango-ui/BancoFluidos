# Banco de Fluidos WebXR

Simulador educativo de mecánica de fluidos en realidad virtual,
ejecutable directamente en el navegador del Meta Quest.

## Etapas
1. **Tanque**: presión hidrostática P = P_atm + ρgh
2. **Tubería**: continuidad A1·v1 = A2·v2 y Bernoulli
3. **Descarga**: Torricelli v = √(2gh)

## Cómo probarlo
1. Clona el repo.
2. Sirve la carpeta con un servidor local:
   `npx serve .` o `python -m http.server 8080`
3. Abre en el navegador del Quest la URL del PC en la red local.
4. Pulsa "Entrar en VR".

## Tecnologías
- Three.js
- WebXR (VRButton)
- HTML/CSS/JS puro