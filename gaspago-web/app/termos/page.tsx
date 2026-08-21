import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Termos de Uso da plataforma Gás Pago — entrega de GLP, rede de afiliados e cashback FGOL.',
}

export default function TermosDeUso() {
  return (
    <div className="legal">
      <style>{`
        .legal { min-height: 100vh; background: var(--ground); }

        .legal-header {
          background: var(--navy);
          padding: 48px clamp(20px, 6vw, 72px) 64px;
          position: relative;
        }
        .legal-back {
          display: inline-flex; align-items: center; gap: 7px;
          color: #B9C6D8; font-size: 13.5px; font-weight: 500; text-decoration: none;
        }
        .legal-back:hover { color: #fff; text-decoration: none; }
        .legal-header h1 {
          margin-top: 28px;
          font-family: 'Sora', -apple-system, sans-serif;
          font-size: clamp(1.9rem, 4.6vw, 3rem); font-weight: 800; letter-spacing: -.03em;
          color: #fff; line-height: 1.12;
        }
        .legal-header .updated {
          margin-top: 12px; font-size: 13.5px; color: #8DA0BB;
        }

        .legal-body {
          max-width: 880px; margin: -40px auto 0; padding: 0 clamp(16px, 5vw, 24px) 100px;
        }
        .legal-card {
          background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
          box-shadow: var(--shadow-md);
          padding: clamp(28px, 5vw, 56px);
        }
        .legal-intro {
          font-size: 1rem; color: var(--sub); line-height: 1.75; max-width: 70ch;
          padding-bottom: 28px; margin-bottom: 28px; border-bottom: 1px solid var(--border);
        }
        .legal-toc {
          display: flex; flex-wrap: wrap; gap: 8px 18px;
          padding-bottom: 28px; margin-bottom: 8px; border-bottom: 1px solid var(--border);
        }
        .legal-toc a {
          font-size: 12.5px; color: var(--sub); text-decoration: none;
          background: var(--surface-2); border: 1px solid var(--border);
          padding: 6px 12px; border-radius: 100px;
        }
        .legal-toc a:hover { color: var(--flame); border-color: var(--flame); text-decoration: none; }

        section.clause { padding-top: 36px; }
        section.clause:first-of-type { padding-top: 8px; }
        section.clause h2 {
          font-family: 'Sora', -apple-system, sans-serif;
          font-size: 1.28rem; font-weight: 800; letter-spacing: -.015em; color: var(--text);
          display: flex; align-items: baseline; gap: 10px; scroll-margin-top: 24px;
        }
        section.clause h2 .num {
          font-family: 'JetBrains Mono', monospace; font-size: .85rem; font-weight: 500; color: var(--flame);
        }
        section.clause p, section.clause li {
          max-width: 70ch; font-size: .96rem; line-height: 1.75; color: var(--sub);
        }
        section.clause p + p { margin-top: 14px; }
        section.clause p { margin-top: 14px; }
        section.clause ul, section.clause ol { margin-top: 14px; padding-left: 22px; display: flex; flex-direction: column; gap: 8px; }
        section.clause strong { color: var(--text); font-weight: 600; }
        section.clause .callout {
          margin-top: 18px; padding: 16px 18px; border-radius: 12px;
          background: var(--flame-dim); border: 1px solid rgba(255,101,36,.25);
          font-size: .92rem; color: #7A3410; line-height: 1.65; max-width: 66ch;
        }

        @media (max-width: 767px) {
          .legal-header { padding: 36px 20px 56px; }
          .legal-body { margin-top: -32px; }
          .legal-card { padding: 24px 18px; border-radius: 16px; }
          .legal-toc { display: none; }
        }
      `}</style>

      <header className="legal-header">
        <a className="legal-back" href="/">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Voltar para o início
        </a>
        <h1>Termos de Uso</h1>
        <p className="updated">Última atualização: 21 de agosto de 2026</p>
      </header>

      <main className="legal-body">
        <div className="legal-card">
          <p className="legal-intro">
            Estes Termos de Uso regulam o acesso e a utilização da plataforma <strong>Gás Pago</strong> (aplicativo móvel,
            site institucional, canal de atendimento via WhatsApp e painéis administrativos), operada por Gás Pago
            Tecnologia Ltda. (&ldquo;Gás Pago&rdquo;, &ldquo;nós&rdquo;). Ao criar uma conta, solicitar um pedido ou de qualquer
            forma utilizar a plataforma, você (&ldquo;usuário&rdquo;) declara que leu, compreendeu e concorda integralmente
            com estes Termos e com a nossa <a href="/privacidade">Política de Privacidade</a>.
          </p>

          <nav className="legal-toc" aria-label="Sumário">
            <a href="#objeto">1. Objeto</a>
            <a href="#cadastro">2. Cadastro</a>
            <a href="#pedidos">3. Pedidos e entrega</a>
            <a href="#pagamentos">4. Pagamentos</a>
            <a href="#fgol">5. FGOL</a>
            <a href="#afiliados">6. Rede de afiliados</a>
            <a href="#cancelamento">7. Cancelamento e reembolso</a>
            <a href="#conduta">8. Conduta proibida</a>
            <a href="#responsabilidade">9. Limitação de responsabilidade</a>
            <a href="#alteracoes">10. Alterações</a>
            <a href="#foro">11. Foro e legislação</a>
          </nav>

          <section className="clause" id="objeto">
            <h2><span className="num">01</span> Objeto</h2>
            <p>
              O Gás Pago é uma plataforma de intermediação tecnológica que conecta consumidores finais a distribuidoras
              parceiras de Gás Liquefeito de Petróleo (GLP), permitindo a solicitação, o pagamento e o acompanhamento de
              pedidos de botijões de gás pelo aplicativo ou pelo WhatsApp. A plataforma também oferece (i) um programa de
              cashback baseado no token utilitário <strong>FGOL</strong>, creditado automaticamente a cada pedido confirmado,
              e (ii) uma rede de indicação e afiliados, por meio da qual usuários podem indicar novos clientes e distribuidoras
              e receber comissões sobre vendas efetivamente realizadas.
            </p>
            <p>
              O Gás Pago <strong>não é uma distribuidora de gás</strong> e não realiza, ela própria, a entrega física dos
              produtos. A plataforma atua exclusivamente como intermediadora tecnológica entre o usuário e as distribuidoras
              parceiras, que são empresas independentes, devidamente licenciadas para comercialização e distribuição de GLP
              conforme a regulamentação da Agência Nacional do Petróleo, Gás Natural e Biocombustíveis (ANP).
            </p>
          </section>

          <section className="clause" id="cadastro">
            <h2><span className="num">02</span> Cadastro e conta do usuário</h2>
            <p>
              O acesso às funcionalidades da plataforma requer a criação de uma conta, realizada por meio de (i)
              verificação de número de telefone via código de uso único (OTP) enviado por SMS ou WhatsApp, ou (ii)
              autenticação com conta Google. É necessário fornecer nome completo, número de telefone válido e, quando
              aplicável, endereço de e-mail. O fornecimento de CPF e de endereço de entrega (CEP e complemento) é exigido
              para a efetivação de pedidos.
            </p>
            <p>
              O usuário é responsável pela veracidade, exatidão e atualização dos dados cadastrais informados, bem como
              pela guarda e sigilo de suas credenciais de acesso. É vedado o compartilhamento de conta entre terceiros e a
              criação de múltiplas contas por uma mesma pessoa com o intuito de burlar limites promocionais, regras de
              cashback ou da rede de afiliados. O Gás Pago pode suspender ou encerrar contas que apresentem dados
              incorretos, incompletos ou indícios de fraude, mediante notificação ao usuário, sempre que possível.
            </p>
          </section>

          <section className="clause" id="pedidos">
            <h2><span className="num">03</span> Pedidos e entrega</h2>
            <p>
              Ao realizar um pedido, o usuário seleciona a distribuidora parceira responsável pela entrega, com base em
              critérios como proximidade, preço, avaliação e prazo estimado exibidos na plataforma. A partir da
              confirmação do pedido pela distribuidora, a responsabilidade pela separação, transporte e entrega física do
              botijão de gás é <strong>integralmente da distribuidora parceira</strong>, incluindo o cumprimento de normas
              de segurança aplicáveis ao transporte e manuseio de GLP.
            </p>
            <p>
              Os prazos de entrega exibidos no aplicativo (por exemplo, estimativas em minutos) têm caráter
              <strong> meramente informativo e não constituem garantia contratual</strong>, podendo variar em razão de
              trânsito, condições climáticas, volume de pedidos, disponibilidade de estoque da distribuidora ou outros
              fatores fora do controle do Gás Pago. Em caso de atraso relevante ou não entrega, o usuário pode contatar o
              suporte pelo aplicativo ou WhatsApp para acompanhamento junto à distribuidora responsável.
            </p>
            <p>
              O usuário deve conferir, no momento da entrega, a integridade do lacre e do botijão recebido, recusando o
              produto em caso de avaria aparente e comunicando o ocorrido imediatamente pelos canais de suporte.
            </p>
          </section>

          <section className="clause" id="pagamentos">
            <h2><span className="num">04</span> Pagamentos</h2>
            <p>
              Os pagamentos realizados na plataforma são processados por meio de PIX ou cartão de crédito/débito,
              utilizando a infraestrutura de pagamentos da <strong>Asaas Gestão Financeira S.A.</strong>, instituição de
              pagamento devidamente autorizada a operar pelo Banco Central do Brasil. O Gás Pago <strong>não realiza
              custódia direta dos valores</strong> pagos pelo usuário: os recursos transitam pela conta de pagamento
              mantida junto à Asaas e são repassados às distribuidoras parceiras conforme regras de split (repasse
              automático) configuradas na plataforma.
            </p>
            <p>
              Dados de cartão de pagamento são inseridos diretamente na interface segura do processador de pagamentos e
              não são armazenados pelos servidores do Gás Pago. O usuário também pode utilizar, total ou parcialmente,
              saldo em FGOL disponível em sua carteira para compor o pagamento de um pedido, na forma da cláusula 5.
            </p>
          </section>

          <section className="clause" id="fgol">
            <h2><span className="num">05</span> FGOL — cashback e natureza do token</h2>
            <p>
              O FGOL é um token utilitário registrado na rede Polygon, cujo saldo de cada usuário é controlado por um
              livro-razão (ledger) interno da plataforma e periodicamente refletido on-chain. O FGOL é creditado
              automaticamente ao usuário como <strong>cashback</strong> — um benefício de fidelidade — sobre pedidos
              efetivamente confirmados e entregues, em percentual definido pela plataforma e/ou pela distribuidora
              parceira, podendo variar por produto, região ou campanha promocional.
            </p>
            <p>
              O FGOL <strong>não constitui, e não deve ser interpretado como, valor mobiliário, instrumento de
              investimento, promessa de rendimento ou aplicação financeira</strong>. O Gás Pago não garante valorização,
              liquidez, cotação mínima ou conversibilidade do FGOL em moeda corrente fora da própria plataforma. O uso do
              FGOL é restrito ao abatimento de pedidos dentro do ecossistema Gás Pago, nos termos e limites definidos pela
              plataforma, que pode ser alterada a qualquer tempo mediante aviso prévio, conforme a cláusula 10.
            </p>
            <div className="callout">
              <strong>Regra de inatividade:</strong> contas sem qualquer pedido, resgate ou movimentação de saldo por
              <strong> 30 (trinta) dias corridos</strong> têm o saldo de FGOL automaticamente <strong>bloqueado</strong>
              para uso, sendo desbloqueado assim que o usuário realizar um novo pedido ou interagir com a carteira. Caso a
              inatividade persista por <strong> 60 (sessenta) dias corridos</strong> (2 meses) a partir do último
              movimento, o saldo de FGOL acumulado é considerado <strong>expirado</strong> e removido da carteira do
              usuário, sem direito a indenização ou compensação. Essas regras têm por finalidade manter o programa de
              cashback sustentável e evitar acúmulo especulativo de saldo, e serão sempre comunicadas de forma destacada
              no aplicativo antes da expiração.
            </div>
          </section>

          <section className="clause" id="afiliados">
            <h2><span className="num">06</span> Rede de afiliados e comissões</h2>
            <p>
              O Gás Pago mantém um programa de indicação em que usuários cadastrados (&ldquo;afiliados&rdquo;) podem
              indicar novos clientes e distribuidoras parceiras por meio de um código ou link de indicação pessoal. Quando
              um indicado realiza pedidos efetivamente pagos e entregues na plataforma, o afiliado que o indicou — e, em
              estruturas multinível, os afiliados situados nos níveis superiores da sua rede — podem receber uma
              comissão em FGOL e/ou em moeda corrente, calculada sobre o valor real transacionado, conforme a estrutura de
              níveis e percentuais vigente divulgada no aplicativo.
            </p>
            <p>
              A comissão é devida <strong>exclusivamente sobre vendas reais de produtos entregues</strong> (transações de
              GLP efetivamente concluídas), e nunca sobre o mero ato de recrutar, cadastrar ou convidar novos afiliados,
              tampouco mediante cobrança de taxa de adesão, compra obrigatória de estoque ou qualquer contrapartida
              financeira para ingressar ou ascender na rede.
            </p>
            <p>
              A participação como afiliado <strong>não constitui vínculo empregatício, societário ou de representação
              comercial</strong> com o Gás Pago, e os valores de comissão divulgados em materiais promocionais são
              estimativas que <strong>não representam garantia de renda</strong>, fixa ou variável. É expressamente
              vedada a utilização da rede de afiliados para práticas de pirâmide financeira, marketing multinível
              baseado em recrutamento, venda casada ou qualquer esquema que gere remuneração desvinculada de vendas reais
              de produto ao consumidor final, conforme vedado pelo Código de Defesa do Consumidor e pela legislação
              aplicável. Constatada tal prática, o Gás Pago poderá suspender contas, reter comissões pendentes e adotar as
              medidas legais cabíveis.
            </p>
          </section>

          <section className="clause" id="cancelamento">
            <h2><span className="num">07</span> Cancelamento e reembolso</h2>
            <p>
              O usuário pode cancelar um pedido sem custo enquanto este ainda não tiver sido aceito pela distribuidora
              parceira. Após a aceitação e início da separação/despacho, o cancelamento fica sujeito à análise da
              distribuidora responsável, podendo não ser mais possível caso a entrega já esteja em rota.
            </p>
            <p>
              Em caso de pedido não entregue, entregue com produto avariado, em desacordo com o solicitado, ou cancelado
              pela distribuidora, o valor pago será estornado ao usuário pelo mesmo meio de pagamento utilizado (PIX ou
              cartão), no prazo operacional da Asaas e das administradoras de cartão, ou creditado como saldo de FGOL,
              conforme opção oferecida ao usuário no momento do atendimento. Cashback em FGOL eventualmente já creditado
              sobre um pedido posteriormente cancelado ou estornado poderá ser revertido/debitado da carteira do usuário.
            </p>
            <p>
              Nos termos do art. 49 do Código de Defesa do Consumidor, o usuário que realizar a contratação fora do
              estabelecimento comercial (aplicativo, WhatsApp) pode exercer o direito de arrependimento em até 7 (sete)
              dias, salvo se o produto já tiver sido consumido — o que, em razão da natureza do bem (gás de cozinha
              lacrado e não devolvível após uso), aplica-se apenas a pedidos ainda não entregues ou entregues com lacre
              intacto e não utilizado.
            </p>
          </section>

          <section className="clause" id="conduta">
            <h2><span className="num">08</span> Conduta proibida</h2>
            <p>Sem prejuízo de outras vedações previstas nestes Termos, é proibido ao usuário:</p>
            <ul>
              <li>Fornecer dados falsos, incompletos ou pertencentes a terceiros no cadastro ou em pedidos;</li>
              <li>Criar contas fictícias, duplicadas ou utilizar indicações próprias (autoindicação) para gerar comissões ou cashback artificiais;</li>
              <li>Manipular, fraudar ou explorar falhas do sistema de indicações, comissões ou de crédito de FGOL;</li>
              <li>Utilizar meios automatizados (bots, scripts) para realizar pedidos, cadastros ou indicações em massa;</li>
              <li>Praticar qualquer forma de assédio, ameaça ou conduta ofensiva contra distribuidoras, entregadores ou equipe de suporte;</li>
              <li>Utilizar a marca Gás Pago, materiais promocionais ou o programa de afiliados para promessas de retorno financeiro garantido ou práticas assimiláveis a pirâmide financeira;</li>
              <li>Realizar engenharia reversa, cópia ou exploração não autorizada do aplicativo, do site ou de suas integrações.</li>
            </ul>
            <p>
              A violação de qualquer item desta cláusula pode resultar em advertência, suspensão temporária, cancelamento
              definitivo da conta, retenção ou estorno de comissões e saldos, sem prejuízo das medidas cíveis e criminais
              cabíveis.
            </p>
          </section>

          <section className="clause" id="responsabilidade">
            <h2><span className="num">09</span> Limitação de responsabilidade</h2>
            <p>
              O Gás Pago envida esforços para manter a plataforma disponível, segura e funcional, mas não garante
              operação ininterrupta ou livre de falhas, podendo haver indisponibilidades temporárias por manutenção,
              atualização, falhas de terceiros (operadoras de telefonia, provedores de nuvem, processador de pagamentos,
              rede blockchain) ou motivos de força maior.
            </p>
            <p>
              O Gás Pago não se responsabiliza por: (i) atos ou omissões das distribuidoras parceiras, incluindo atrasos,
              qualidade do produto entregue ou condutas de seus entregadores; (ii) oscilações, indisponibilidade ou
              congestionamento da rede Polygon que afetem o registro on-chain do FGOL; (iii) prejuízos decorrentes do uso
              indevido da conta pelo próprio usuário ou de terceiros que tenham acesso não autorizado por falha de guarda
              de credenciais imputável ao usuário; e (iv) danos indiretos, lucros cessantes ou expectativas de ganho
              relacionadas ao programa de cashback ou de afiliados.
            </p>
            <p>
              Nada nesta cláusula exclui responsabilidades que não possam ser limitadas por lei, incluindo aquelas
              decorrentes de dolo, culpa grave ou de direitos básicos do consumidor previstos no Código de Defesa do
              Consumidor.
            </p>
          </section>

          <section className="clause" id="alteracoes">
            <h2><span className="num">10</span> Alterações nos termos</h2>
            <p>
              O Gás Pago pode alterar estes Termos de Uso a qualquer momento, para refletir mudanças legais, evolução da
              plataforma ou ajustes de modelo de negócio (incluindo percentuais de cashback e de comissões). Alterações
              relevantes serão comunicadas por aviso no aplicativo, no site institucional ou por e-mail/WhatsApp, com
              indicação da nova data de &ldquo;última atualização&rdquo; no topo desta página. O uso continuado da
              plataforma após a entrada em vigor das alterações caracteriza aceitação dos novos termos; caso o usuário não
              concorde, deve cessar o uso da plataforma e pode solicitar o encerramento de sua conta.
            </p>
          </section>

          <section className="clause" id="foro">
            <h2><span className="num">11</span> Foro e legislação aplicável</h2>
            <p>
              Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil, incluindo o Código Civil, o
              Código de Defesa do Consumidor, o Marco Civil da Internet e a Lei Geral de Proteção de Dados (Lei nº
              13.709/2018). Fica eleito o foro do domicílio do usuário consumidor para dirimir quaisquer controvérsias
              oriundas destes Termos, conforme faculta a legislação consumerista, sem prejuízo da possibilidade de
              solução amigável por meio dos canais de atendimento do Gás Pago.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
