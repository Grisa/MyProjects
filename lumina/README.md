# Lumina

Endless runner vertical. Uma bolinha de luz fica na base da tela e só anda para os lados. A luz é o campo de visão: no escuro as sombras só mostram uma borda colorida, e o brilho acende a face virada para a bolinha. Cada uma que passa soma um ponto. Cada colisão apaga um pedaço da luz. Quando a luz acaba, a partida termina.

O recorde fica neste aparelho, na chave `lumina-high-score` do `localStorage`. O jogo não envia dados para lugar nenhum.

## Jogar no computador

Na pasta `lumina`:

```bash
npm test
python3 -m http.server 4173
```

Abra `http://127.0.0.1:4173`. Clique para começar e arraste para os lados. O módulo do jogo precisa de um servidor; abrir o `index.html` direto no disco não carrega o `import`.

## Jogar no celular

Sirva a pasta numa máquina acessível na mesma rede e abra o endereço no navegador, em pé. O dedo arrasta a bolinha. Dá para instalar o atalho pela tela inicial: o `manifest.webmanifest` pede retrato e tela cheia.

## Play Store

Esta pasta já é o app web. O Capacitor gera o projeto Android em volta dela. A publicação em si usa a sua conta da Play Console e uma chave de assinatura sua. Nada disso entra no repositório.

1. Crie a conta de desenvolvedor na Google Play Console.
2. Troque `appId` em `capacitor.config.json` para o identificador definitivo, no formato `com.seudominio.lumina`, antes de gerar o Android.
3. Na pasta `lumina`:

   ```bash
   npm install
   npx cap add android
   ```

   O `webDir` é a própria pasta do jogo. Se `node_modules` estiver aqui na hora do `npx cap sync`, o app leva essas dependências junto. Apague `node_modules`, rode o sync e instale de novo se o projeto Android ficar grande.
4. Em `android/app/src/main/AndroidManifest.xml`, na activity principal, fixe a orientação:

   ```xml
   android:screenOrientation="portrait"
   ```

5. Gere o ícone adaptativo a partir de `icon.svg` (a loja pede PNG de 512 px, além dos tamanhos do Android).
6. No Android Studio, crie um keystore de upload e gere o Android App Bundle assinado (Build, Generate Signed Bundle). Guarde o keystore fora do git.
7. Na Play Console, preencha a ficha: texto, ícone, gráfico de destaque, capturas em retrato, classificação etária e uma URL pública de política de privacidade. Use o `targetSdk` que a loja exigir na data do envio.

Texto que pode ir na política: o Lumina não tem conta, anúncio nem rede. A única informação guardada é a maior pontuação, e ela permanece no aparelho.

`npm test` cobre colisão (círculo e losango) e a curva de dificuldade. A cada 7 segundos a queda fica 8% mais rápida e o intervalo entre inimigos cai 8%, sem ficar menor que 0,28 s.
