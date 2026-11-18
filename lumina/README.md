# Lumina

Endless runner vertical. Uma bolinha de luz fica na base da tela e só anda para os lados. A luz é o campo de visão: no escuro as sombras só mostram uma borda colorida, e o brilho acende a face virada para a bolinha. Cada uma que passa soma um ponto. Passar rente da bolinha, ainda dentro da luz, soma dois. Cada colisão apaga um pedaço da luz. Quando a luz acaba, a partida termina. Aos 400 pontos a luz explode, os inimigos param de nascer por 3 segundos e a visão abre. A partida continua nesse campo maior, e a partir daí os inimigos caem em dupla, cada um de um jeito, com um vão entre os dois. Até lá cai um por vez: bolha e caco no começo, lasca e riso a partir dos 200 pontos, vigia só depois que o campo abre. O caco escorrega devagar, para a virada na borda dar para ler. O vigia segura até perto do meio da tela e depois cai só um pouco mais rápido. A subida da velocidade até os 400 é branda: nesse ponto a sombra ainda leva cerca de 1,6 s para chegar. A queda e o nascimento sobem com os pontos até o teto do ato: ato 1 até 200, ato 2 até 400, ato 3 até 600. No sem fim esse teto sobe 2% a cada 100 pontos. As ondas nascem mais juntas do que antes. A troca de ato muda a cor do fundo e escreve o nome do ato debaixo do placar.  Aos 600 o Manto cobre o topo e toma o nascimento. Cada ataque é um corredor que sai de baixo do Manto: fileiras com um vão que muda de lugar, e a faixa que você acabou de deixar se fecha. A luz fica só no último vão. Pegar esse núcleo acerta o Manto e devolve um pouco de luz. Encostar na sombra continua apagando. Três núcleos e ele se abre. Enquanto ele está em cena, sombra que passa não dá ponto. Se duas luzes de dano caem seguidas sem serem pegas, ele fecha o campo com uma linha que acerta uma vez. A corrida segue, e ele volta a cada 300 pontos. O vão, a altura, a velocidade e o ritmo mudam a cada onda, e uma delas costuma nascer na faixa da bolinha. Um pó fixo e bem fraco fica atrás da luz: quando a visão abre, esses pontos encolhem e entra mais campo no quadro. Ficar parado na borda não protege: o próximo inimigo nasce em cima de quem está no canto.

Na primeira abertura, quatro cenas mostram o movimento, a luz, os pontos e o campo. Dá para pular. Em Ajustes, Como jogar abre as mesmas cenas. Apagar os dados traz esse tutorial na próxima abertura. O menu também diz que a luz é a vida até a primeira partida. Sair do app, minimizar ou chegar uma notificação por cima pausa a partida até o próximo toque. O som para junto e só volta com o jogo na tela.

Faíscas caem com menos frequência que os inimigos. Pegar uma devolve um pouco da luz e soma uma faísca. As faíscas ficam salvas neste aparelho e compram melhorias, em níveis: Passo 1, 2 e 3 deixam a bolinha seguir o dedo, Luz 1, 2 e 3 aumentam o brilho, Casco 1, 2 e 3 reduzem o dano, Ímã 1, 2 e 3 puxam faíscas. Escudo 1, 2 e 3 seguram um golpe a cada 5, 4 e 3 faíscas, e custam mais que os outros níveis. A árvore inteira custa 3840 faíscas: o primeiro nó sai em uma partida curta, os níveis seguintes dobram, e Plenty, Cinder e Prism, que multiplicam as faíscas, custam mais que um nível comum. Mark, depois do Clarão, pinta a faixa de um desvio rente. A próxima sombra que cair nessa faixa apaga, sem ponto. Vesper, depois da Luz 3, devolve uma fatia da luz inicial a cada ato e para antes de enchê-la. Clarão faz cair, de vez em quando, uma faísca azul que apaga as sombras perto. No começo a bolinha responde devagar. Na árvore, o que já foi comprado acende, o que dá para comprar agora tem uma luz fraca, e o resto fica apagado.

Os textos do jogo estão em inglês. No menu, o nome usa a fonte fina. A luz da bolinha acende as letras, e essa frase fica guardada em vez de ser refeita a cada quadro. O brilho dos botões também. Na partida, o placar e o botão Settings continuam sem borrado. O recorde fica junto dessa luz, e Play, Upgrades e Codex formam um bloco embaixo. No fim da partida, uma luz pequena acende a frase, o placar fica com ela, e a tela diz qual sombra apagou a luz e quantos pontos faltavam para o próximo ato. Play again e Upgrades formam um bloco embaixo. Codex, ao lado de Melhorias, mostra como cada sombra cai: a bolha desce reto, o caco escorrega e volta na borda, a lasca treme, o vigia segura e depois despenca, e o riso abre um S largo. Os rostos só aparecem nessa luz: a bolha é sonolenta, o caco é sério, a lasca se assusta, o vigia observa, o riso sorri e o Manto cobre o topo.

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

`npm test` cobre colisão, os tetos de cada ato, o ponto do desvio rente, a árvore de melhorias, o ritmo do anúncio e os corredores do Manto. A queda e o nascimento param no teto do ato, e no sem fim sobem 2% a cada 100 pontos. O Manto substitui esse nascimento enquanto está em cena.
