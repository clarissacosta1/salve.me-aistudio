import { SafetyGuide } from "../types";

export const SAFETY_GUIDES: SafetyGuide[] = [
  {
    id: "being-followed",
    title: "Sendo Seguido(a) na Rua",
    englishTitle: "Being Followed on the Street",
    description: "Passos imediatos para desviar-se e encontrar refúgio seguro.",
    englishDescription: "Immediate steps to break away and locate a safe refuge.",
    category: "safety",
    steps: [
      "Mantenha a cabeça erguida e olhe ao redor com confiança. Mostre que você está ciente.",
      "Mude de calçada ou alterne o ritmo. Veja se o suspeito repete seus movimentos.",
      "Dirija-se imediatamente para locais populosos ou bem iluminados (posto de gasolina, farmácia, supermercado).",
      "Inicie uma 'Chamada Simulada' em nosso aplicativo tocando no botão superior para afastar potenciais agressores.",
      "Se sentir perigo iminente, ligue imediatamente para a Polícia (190) ou dispare o Botão de Pânico."
    ],
    englishSteps: [
      "Keep your head up and scan around confidently. Show that you are aware of your surroundings.",
      "Cross the street or change your pace. Check if the person mimics your actions.",
      "Head immediately toward bright, crowded commercial places (gas stations, pharmacies, stores).",
      "Simulate an incoming phone call using our 'Simulated Call' tool to deter potential threats.",
      "If you feel imminent danger, immediately dial police numbers or hit the Panic Button."
    ]
  },
  {
    id: "heimlich",
    title: "Asfixia / Engasgo",
    englishTitle: "Choking (Heimlich Maneuver)",
    description: "Método rápido de salvamento para adultos e crianças com vias aéreas obstruídas.",
    englishDescription: "Quick rescue procedure for obstructed airways in adults and children.",
    category: "first-aid",
    steps: [
      "Pergunte 'Você está engasgado?'. Se puder falar ou tossir, incentive a continuar tossindo.",
      "Se não falar, posicione-se por trás, envolva a cintura do engasgado com as mãos.",
      "Feche um punho sobre a boca do estômago (logo acima do umbigo e bem abaixo do esterno).",
      "Segure o punho com a outra mão e comprima para dentro e para cima, simulando uma letra 'J'.",
      "Repita os movimentos firmes até que o objeto saia ou a pessoa perca a consciência (nesse caso, inicie RCP)."
    ],
    englishSteps: [
      "Ask 'Are you choking?'. If the person can speak or cough, encourage them to keep coughing.",
      "If they cannot speak, stand behind them, wrap your arms around their waist.",
      "Make a fist with one hand and place it just above the navel (well below the breastbone).",
      "Grasp your fist with your other hand and press into the abdomen with a quick, upward thrust (J-shaped compression).",
      "Repeat until the object is expelled or the victim becomes unresponsive (then begin CPR)."
    ]
  },
  {
    id: "silent-help",
    title: "Sinal de Socorro Silencioso (Violência)",
    englishTitle: "Signal for Help (Domestic Violence)",
    description: "Como usar e identificar o sinal internacional de ajuda silenciosa.",
    englishDescription: "How to use and identify the international silent request for assistance.",
    category: "aggression",
    steps: [
      "O sinal consiste em: 1) Erguer a palma da mão virada para a pessoa; 2) Encostar o polegar na palma; 3) Dobrar os outros quatro dedos sobre o polegar.",
      "Use este sinal discretamente em chamadas de vídeo ou pessoalmente se estiver sob ameaça de violência doméstica.",
      "Caso identifique alguém fazendo isso: não faça perguntas diretas que possam colocar a vítima em risco.",
      "Ligue imediatamente para o 180 (Central da Mulher Brasil) ou 190 (Polícia) se houver urgência.",
      "Mantenha registros seguros de localização e contatos rápidos acionado por dispositivos confidenciais."
    ],
    englishSteps: [
      "The signal is: 1) Hold hand up with palm facing the camera/person; 2) Tuck thumb into your palm; 3) Fold your other fingers down over your thumb.",
      "Use this signal discreetly in video calls or in person if you are threatened by domestic abuse.",
      "If you spot someone doing this, do not ask obvious questions that might alert the abuser.",
      "Contact hotlines (such as central 180 in Brazil) or local emergency services immediately.",
      "Securely keep records of locations and use stealth apps or emergency quick triggers."
    ]
  },
  {
    id: "cardiac",
    title: "Ataque Cardíaco / Parada",
    englishTitle: "Heart Attack Symptoms",
    description: "Como discernir os sintomas e agir de forma extremamente decisiva.",
    englishDescription: "How to identify cardiac distress and take prompt life-saving decisions.",
    category: "first-aid",
    steps: [
      "Identifique sinais: dor ou opressão no peito que pode irradiar para o braço esquerdo, mandíbula ou costas.",
      "Ligue para o SAMU (192) prontamente e diga 'Possível infarto'. Compartilhe as coordenadas.",
      "Coloque a pessoa sentada ou recostada confortavelmente para diminuir a carga cardíaca.",
      "Se a pessoa perder a consciência e parar de respirar, coloque-a de costas no chão duro.",
      "Inicie massagens de ressuscitação (RCP): posicione as mãos no centro do peito e pressione forte e rápido (100 a 120 compressões por minuto ao ritmo da música 'Stayin' Alive')."
    ],
    englishSteps: [
      "Identify signs: chest tightness/pain that spreads to the left arm, shoulder, jaw, or upper back.",
      "Contact emergency ambulance services immediately (Emergency 192 in Brazil). State 'Possible heart attack'.",
      "Make the person sit or lean back comfortably to lessen cardiac work.",
      "If they lose responsiveness and stop breathing, place them on their back on a firm surface.",
      "Begin chest compressions (CPR): place hands in the middle of the chest and compress down hard and fast (100-120 beats per minute to the tempo of 'Stayin' Alive')."
    ]
  },
  {
    id: "panic",
    title: "Ataque de Pânico / Ansiedade Crítica",
    englishTitle: "Panic Attack Relief",
    description: "Técnicas de ancoragem imediata para reduzir taquicardia e hiperventilação.",
    englishDescription: "Immediate grounding guidelines to suppress hyperventilation and rapid pulse.",
    category: "panic",
    steps: [
      "Aplique a respiração guiada de forma cíclica: inspire lentamente pelo nariz por 4 segundos, segure por 4, e expire pela boca por 4.",
      "Ancoragem (Técnica 5-4-3-2-1): Nomeie mentalmente 5 coisas que você vê, 4 que pode tocar, 3 que ouve, 2 que sente o cheiro e 1 que saboreia.",
      "Lembre-se: 'Isso é uma resposta fisiológica extrema de estresse. Ela vai passar. Eu estou seguro agora'.",
      "Use o assistente de IA deste aplicativo digitando 'Conselho para pânico' para receber orientações suaves por áudio em texto.",
      "Feche os olhos se houver sobrecarga sensorial e foque na sola dos seus pés firmes no chão."
    ],
    englishSteps: [
      "Perform box breathing: inhale slowly for 4 seconds, hold for 4 seconds, exhale for 4 seconds.",
      "Grounding (5-4-3-2-1 technique): Look around and spot 5 things you can see, 4 to touch, 3 to hear, 2 to smell, and 1 to taste.",
      "Affirm to yourself: 'This is an extreme physiological response. It is temporary. I am physically safe.'",
      "Consult the AI Safety assistant here by typing 'Panic advisory' for smooth soothing text patterns.",
      "Close your eyes if there is visual stimulation overload. Concentrate on the pressure of your feet against the floor."
    ]
  }
];
