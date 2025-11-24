export default function handler(req, res) {
  // Permitir CORS para qualquer origem
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Content-Type", "application/json");

  // Responder a pré-flight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Links com chaves
  const links = {
    "chave1": "https://diarrhoeaeaglesunday.com/a3capzaq2?key=9dccf625ac2c26f479e97c0486e10e10",
    "chave2": "https://diarrhoeaeaglesunday.com/sm0mydpxg9?key=6b0de1e2c24e6e7b5e3c2f37628c617b",
    "chave3": "https://diarrhoeaeaglesunday.com/vs1pmfwsk?key=6fe36a5ab605c531f67731b3bff35658",
    "chave4": "https://diarrhoeaeaglesunday.com/dyip40wmc8?key=b3520bd4dbfe54849bf452ff1e20ca1d"
  };

  return res.status(200).json(links);
}
