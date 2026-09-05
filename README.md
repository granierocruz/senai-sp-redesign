# SENAI-SP • Redesign Acadêmico Moderno

> **Aviso Acadêmico:** Este projeto é um **redesign acadêmico moderno** concebido para demonstrar excelência em Engenharia Front-End, UI/UX de ponta e aplicação da identidade visual do **SENAI São Paulo (Serviço Nacional de Aprendizagem Industrial)**.

---

## 📌 Visão Geral do Projeto

O objetivo deste projeto é transformar a experiência digital do portal do **SENAI-SP**, trazendo uma linguagem visual inspirada na **Indústria 4.0**, com estética futurista, alto contraste, acessibilidade e foco na conversão e retenção de alunos.

O layout foi extraído e adaptado diretamente do projeto gerado no **Google Stitch** via SDK oficial (`@google/stitch-sdk`), convertendo o protótipo em código limpo, semântico e responsivo com **Tailwind CSS**.

---

## 🎨 Identidade Visual e Design System

A identidade respeita rigorosamente o manual de marca do SENAI-SP, agregando toques modernos como glassmorphism, microinterações e suporte nativo a temas:

| Elemento | Cor / Padrão | Aplicação |
| :--- | :--- | :--- |
| **Vermelho SENAI Primário** | `#e30613` | Ações principais, CTAs, badges de destaque e acentos |
| **Vermelho Profundo** | `#C40510` | Estados de *hover*, gradientes e cabeçalho do portal |
| **Vermelho Acento** | `#ff4d58` | Realces e textos em gradiente no tema escuro |
| **Dark Background** | `#0b0d11` / `#12161d` | Fundo imersivo no tema escuro (Dark Mode) |
| **Dark Card & Surface** | `#181d26` / `#272f3d` | Superfície dos cards e bordas sutis industriais |
| **Grafite Base** | `#1d1d1b` / `#22262a` | Textos e elementos da FIESP/CIESP |
| **Branco & Tons Claros** | `#ffffff` / `#f8f9fb` | Superfícies limpas no tema claro (Light Mode) |

### Tipografia
- **Títulos & Headlines:** `Montserrat` (Pesos 600, 700, 800 e 900) para solidez e impacto visual industrial.
- **Corpo de Texto:** `Inter` (Pesos 300, 400, 500 e 600) para máxima legibilidade em qualquer dispositivo.
- **Badges e Cargas Horárias:** `JetBrains Mono` para um toque tecnológico e precisão nos dados.

---

## 🚀 Principais Funcionalidades

### 1. Header Fixo & Portal do Aluno
- Logotipo oficial do SENAI-SP com divisor institucional.
- **Botão "Portal do Aluno" em destaque:** Abre um modal interativo completo contendo:
  - Formulário de login por CPF ou Matrícula/RA com recuperação de senha.
  - Aba de **Serviços Rápidos** (acesso ao AVA Moodle, emissão de Atestado de Matrícula com QR Code e Carteirinha Digital do Estudante).
- Alternador dinâmico de **Tema Claro / Escuro (Dark/Light Mode)** com persistência automática no `localStorage`.
- Menu mobile expansível e acessível.

### 2. Hero Section 4.0
- Background com imagem de laboratório tecnológico e gradiente de alta fidelidade extraídos do Google Stitch.
- Badge animado em tempo real: *"Inscrições Abertas • Processo 2025/2026"*.
- **Barra de busca inteligente:** Filtra dinamicamente os cursos em tempo real à medida que o usuário digita.

### 3. Métricas e KPIs de Empregabilidade
- Card elevado com estatísticas de impacto:
  - **92,4%** de taxa de empregabilidade comprovada no Estado de SP.
  - **+150 Unidades** e centros de treinamento tecnológico.
  - **100% de Gratuidade** através da Gratuidade Regimental.

### 4. Catálogo de Cursos Interativo
- **Filtros por Categoria (Chips):**
  - *Todos os Cursos*
  - *Cursos Técnicos*
  - *TI & Software*
  - *Robótica & Automação*
  - *Energias Renováveis*
  - *Qualificação Rápida*
- **Cards Técnicos Especializados:**
  1. Automação e Robótica Industrial
  2. Desenvolvimento de Sistemas & IA
  3. Mecânica de Precisão & Mecatrônica
  4. Energias Renováveis & Eletromobilidade
  5. Cibersegurança & Redes Industriais (OT)
  6. Manufatura Aditiva & Prototipagem 3D
- **Modal de Detalhes:** Ao clicar em *"Ver detalhes"*, é aberto um modal com a carga horária detalhada, descrição e pré-requisitos recomendados.

### 5. Seção de Bolsas de Estudo (Gratuidade Regimental)
- Banner estilizado em gradiente carmesim destacando as vagas 100% gratuitas oferecidas pelo SENAI para a comunidade e jovens aprendizes.

### 6. Diferenciais Laboratoriais & Rodapé Completo
- Seção destacando os laboratórios homologados pela indústria global e o banco de talentos integrado com as empresas da FIESP/CIESP.
- Rodapé institucional contendo mapa de links, transparência, ouvidoria e dados de sede.

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 Semântico:** Estrutura acessível com tags como `<header>`, `<main>`, `<section>`, `<article>`, `<aside>` e `<footer>`.
- **Tailwind CSS:** Configuração customizada com paleta de cores SENAI e tipografia sob medida.
- **JavaScript Vanilla:** Lógica limpa (Clean Code), sem dependências pesadas, para gerenciamento de modais, busca reativa, filtros e temas.
- **Google Fonts & Google Material Symbols:** Ícones e fontes web de alta performance.
- **Google Stitch SDK (`@google/stitch-sdk`):** Ferramenta utilizada para extrair os componentes e referências originais do projeto.

---

## 💻 Como Visualizar Localmente

Basta abrir o arquivo `index.html` em qualquer navegador moderno:

1. **Via Navegador Direto:**
   - Dê um duplo clique no arquivo `index.html`.

2. **Via Servidor Local (ex: Live Server ou npx serve):**
   ```bash
   npx serve .
   ```
   Acesse no seu navegador: `http://localhost:3000`.

---

## 📄 Licença e Uso

Este projeto foi elaborado para fins puramente **educacionais e de demonstração acadêmica**. As marcas, logos e referências ao SENAI-SP, FIESP e CIESP pertencem aos seus respectivos detentores de direitos.
