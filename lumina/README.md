# Lumina

Endless runner vertical. Uma bolinha de luz fica na base da tela e só anda para os lados. A luz é o campo de visão: no escuro as sombras só mostram uma borda colorida, e o brilho acende a face virada para a bolinha. Cada uma que passa soma um ponto. Cada colisão apaga um pedaço da luz. Quando a luz acaba, a partida termina.

Faíscas caem com menos frequência que os inimigos. Pegar uma devolve um pouco da luz e soma uma faísca. As faíscas ficam salvas neste aparelho e compram melhorias: cada compra libera os próximos nós da árvore. Dá para encolher o núcleo, estender a luz, ver a borda das sombras antes, sobreviver a um golpe fatal, frear a queda, espaçar os inimigos e transformar faísca em ponto.

No menu, o nome fica fino e quase apagado. A luz da bolinha é que acende as letras. Os inimigos também só mostram o rosto nessa luz: a bolha é sonolenta, o caco é sério, a lasca se assusta e oscila, o vigia observa e o riso sorri.

O som também nasce no aparelho. Um fundo grave fica mais fino quando a luz baixa, e cada faísca, batida e fim de partida tem um efeito curto. O alto-falante no canto desliga o som. A escolha fica em `lumina-muted`.

O recorde fica em `lumina-high-score`. As faíscas e as melhorias compradas ficam em `lumina-sparks` e `lumina-upgrades`. O navegador guarda isso só no aparelho e não mostra anúncio. No app da Play Store, a cada duas mortes pode abrir um anúncio em tela cheia da Google.

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

O jogo está pronto para virar o app. Ainda não dá para enviar a ficha: isso usa a sua conta da Play Console, um keystore seu e os IDs do AdMob. Nada disso entra no repositório.

1. Crie a conta de desenvolvedor na Google Play Console.
2. No AdMob, crie o app e um bloco **intersticial**. Cole o ID do app e o ID do bloco em `js/ads.js` (`appId` e `interstitialId`) e mude `testing` para `false`. Enquanto `testing` estiver `true`, o app usa o anúncio de teste da Google.
3. Troque `appId` em `capacitor.config.json` para o identificador definitivo, no formato `com.seudominio.lumina`, antes de gerar o Android.
4. Na pasta `lumina`:

   ```bash
   npm install
   npx cap add android
   ```

   O `webDir` é a própria pasta do jogo. Se `node_modules` estiver aqui na hora do `npx cap sync`, o app leva essas dependências junto. Apague `node_modules`, rode o sync e instale de novo se o projeto Android ficar grande.
5. Em `android/app/src/main/AndroidManifest.xml`, na activity principal, fixe a orientação:

   ```xml
   android:screenOrientation="portrait"
   ```

   Dentro de `<application>`, o AdMob exige o ID do app. Use o de teste enquanto `testing` for `true` (`ca-app-pub-3940256099942544~3347511713`) e troque pelo seu antes de publicar:

   ```xml
   <meta-data
       android:name="com.google.android.gms.ads.APPLICATION_ID"
       android:value="ca-app-pub-3940256099942544~3347511713" />
   ```

6. Gere o ícone adaptativo a partir de `icon.svg` (a loja pede PNG de 512 px, além dos tamanhos do Android).
7. No Android Studio, crie um keystore de upload e gere o Android App Bundle assinado (Build, Generate Signed Bundle). Guarde o keystore fora do git.
8. Na Play Console, preencha a ficha: texto, ícone, gráfico de destaque, capturas em retrato, classificação etária e uma URL pública de política de privacidade. Use o `targetSdk` que a loja exigir na data do envio. Na seção de segurança dos dados, declare que o anúncio é da Google.

O anúncio abre em tela cheia a cada duas mortes, depois que a luz apaga. No navegador ele não aparece. Texto que pode ir na política: o Lumina não tem conta. Recorde, faíscas e melhorias ficam no aparelho. No app Android, o AdMob pode receber identificadores do aparelho para mostrar o anúncio.

`npm test` cobre colisão, a curva de dificuldade, a árvore de melhorias e o ritmo do anúncio. A cada 7 segundos a queda fica 8% mais rápida e o intervalo entre inimigos cai 8%, sem ficar menor que 0,28 s.
