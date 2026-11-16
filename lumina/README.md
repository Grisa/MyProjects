# Lumina

Endless runner vertical. Uma bolinha de luz fica na base da tela e só anda para os lados. A luz é o campo de visão: no escuro as sombras só mostram uma borda colorida, e o brilho acende a face virada para a bolinha. Cada uma que passa soma um ponto. Passar rente da bolinha, ainda dentro da luz, soma dois. Cada colisão apaga um pedaço da luz. Quando a luz acaba, a partida termina. Aos 400 pontos a luz explode, os inimigos param de nascer por 3 segundos e a visão abre. A partida continua nesse campo maior, e a partir daí os inimigos caem em dupla, cada um de um jeito, com um vão entre os dois. Até lá cai um por vez: bolha e caco no começo, lasca e riso a partir dos 200 pontos, vigia só depois que o campo abre. O intervalo fica perto de 1,2 s antes e de 0,9 s depois. Aos 600 o Manto cobre o topo e toma o nascimento. Ele solta frases de sombras, numa ordem sorteada, e cada frase deixa um núcleo de luz num vão. Pegar esse núcleo acerta o Manto e devolve um pouco de luz. Encostar na sombra continua apagando. Três núcleos e ele se abre. A corrida segue, e ele volta a cada 300 pontos. O vão, a altura, a velocidade e o ritmo mudam a cada onda, e uma delas costuma nascer na faixa da bolinha. Um pó fixo e bem fraco fica atrás da luz: quando a visão abre, esses pontos encolhem e entra mais campo no quadro. Ficar parado na borda não protege: o próximo inimigo nasce em cima de quem está no canto.

Na primeira abertura, quatro cenas mostram o movimento, a luz, os pontos e o campo. Dá para pular. Em Ajustes, Como jogar abre as mesmas cenas. Apagar os dados traz esse tutorial na próxima abertura. O menu também diz que a luz é a vida até a primeira partida. Sair do app, minimizar ou chegar uma notificação por cima pausa a partida até o próximo toque. O som para junto e só volta com o jogo na tela.

Faíscas caem com menos frequência que os inimigos. Pegar uma devolve um pouco da luz e soma uma faísca. As faíscas ficam salvas neste aparelho e compram melhorias, em níveis: Passo 1, 2 e 3 deixam a bolinha seguir o dedo, Luz 1, 2 e 3 aumentam o brilho, Casco 1, 2 e 3 reduzem o dano, Ímã 1, 2 e 3 puxam faíscas. No começo a bolinha responde devagar. Na árvore, o que já foi comprado acende, o que dá para comprar agora tem uma luz fraca, e o resto fica apagado.

No menu, o nome fica fino e quase apagado. A luz da bolinha é que acende as letras. Codex, ao lado de Melhorias, mostra como cada sombra cai: a bolha desce reto, o caco escorrega e volta na borda, a lasca treme, o vigia segura e depois despenca, e o riso abre um S largo. Os rostos só aparecem nessa luz: a bolha é sonolenta, o caco é sério, a lasca se assusta, o vigia observa, o riso sorri e o Manto cobre o topo.

O som também nasce no aparelho. O fundo troca de acorde a cada poucos segundos, as notas entram e somem, e o grave fica mais fino quando a luz baixa. Faísca, batida e fim de partida têm um efeito curto. Em Ajustes, a música e os efeitos têm um volume cada um. Apagar dados pede confirmação e zera recorde, faíscas e melhorias. Para ouvir cada som fora da partida, abra `samples.html`.

O recorde fica em `lumina-high-score`. As faíscas e as melhorias compradas ficam em `lumina-sparks` e `lumina-upgrades`. A frase da primeira vez some depois da primeira partida (`lumina-hint`). O tutorial visto fica em `lumina-tutorial`. O navegador guarda isso só no aparelho e não mostra anúncio. No app da Play Store, a cada duas mortes pode abrir um anúncio em tela cheia da Google.

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
4. Na pasta `lumina`. O Capacitor não aceita a raiz como `webDir`, então a cópia que entra no app fica em `www`. O navegador continua abrindo a raiz.

   ```bash
   npm install
   rm -rf www
   mkdir www
   cp -a index.html css js fonts icon.svg manifest.webmanifest www/
   npx cap add android
   ```

   No `android/build.gradle`, dentro de `buildscript.dependencies`, acrescente o Kotlin que o anúncio usa:

   ```gradle
   classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.10"
   ```
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

6. Para instalar no celular sem a loja, ainda na pasta `android`:

   ```bash
   ./gradlew assembleDebug
   ```

   O APK fica em `app/build/outputs/apk/debug/app-debug.apk`. Ele é assinado com a chave de debug. A Play Store pede o bundle assinado com o seu keystore, no passo seguinte.
7. Gere o ícone adaptativo a partir de `icon.svg` (a loja pede PNG de 512 px, além dos tamanhos do Android).
8. No Android Studio, crie um keystore de upload e gere o Android App Bundle assinado (Build, Generate Signed Bundle). Guarde o keystore fora do git.
9. Na Play Console, preencha a ficha: texto, ícone, gráfico de destaque, capturas em retrato, classificação etária e uma URL pública de política de privacidade. Use o `targetSdk` que a loja exigir na data do envio. Na seção de segurança dos dados, declare que o anúncio é da Google.

O anúncio abre em tela cheia a cada duas mortes, depois que a luz apaga. No navegador ele não aparece. Texto que pode ir na política: o Lumina não tem conta. Recorde, faíscas e melhorias ficam no aparelho. No app Android, o AdMob pode receber identificadores do aparelho para mostrar o anúncio.

`npm test` cobre colisão, a curva de dificuldade, o ponto do desvio rente, a árvore de melhorias, o ritmo do anúncio e as frases do Manto. A cada 7 segundos a queda fica 8% mais rápida. O nascimento não acompanha essa curva: uma sombra a cada 1,2 s até o campo abrir, e uma dupla a cada 0,9 s depois. O Manto substitui esse nascimento enquanto está em cena.
