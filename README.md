# Protótipo — Instalações Elétricas de Baixa Tensão

Ferramenta didática em **HTML, CSS e JavaScript puro** para preencher e calcular tabelas de atividades de instalações elétricas de baixa tensão.

## O que o protótipo faz

- Cadastro de dependências/ambientes.
- Cálculo automático de área e perímetro por medidas, com opção de digitar manualmente.
- Previsão de carga de iluminação.
- Quantidade mínima de TUGs.
- Cadastro de TUEs por dependência.
- Tabela de cargas obtidas.
- Cálculo de potência ativa usando fator de potência editável.
- Sugestão didática de tipo de medidor com limites editáveis.
- Exportação em CSV, JSON, Markdown e impressão/PDF.
- Botão para carregar um exemplo inspirado nas folhas das fotos.

## Arquivos

- `index.html` — tela principal.
- `style.css` — aparência do protótipo.
- `app.js` — regras de cálculo e interatividade.

## Como usar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie os arquivos `index.html`, `style.css`, `app.js` e `README.md` para a raiz do repositório.
3. Vá em **Settings > Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/root`.
6. Salve. Depois de alguns minutos, o GitHub Pages mostrará o link do site.

## Observação importante

Este projeto é um **protótipo didático**. As regras, fatores de potência e limites de fornecimento/medidor podem variar conforme a norma adotada, a orientação do professor e a concessionária local. Não use como projeto executivo sem revisão de profissional habilitado.
