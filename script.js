
const form = document.getElementById("url-form");
const input = document.getElementById("url-input");
const button = document.getElementById("shorten-btn");
const buttonLabel = button.querySelector(".button-label");
const message = document.getElementById("form-message");

const result = document.getElementById("result");
const shortUrl = document.getElementById("short-url");
const qrContainer = document.getElementById("qrcode");
const copyButton = document.getElementById("copy-btn");
const downloadButton = document.getElementById("download-btn");
const toast = document.getElementById("toast");

let currentUrl = "";
let toastTimeout;

document.getElementById("year").textContent =
  new Date().getFullYear();

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function normalizeUrl(value) {
  let url;

  try {
    url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`
    );
  } catch {
    throw new Error("Digite uma URL válida.");
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    !url.hostname.includes(".") ||
    url.hostname.includes(" ") ||
    url.hostname.startsWith(".") ||
    url.hostname.endsWith(".")
  ) {
    throw new Error("Informe um endereço público válido.");
  }

  if (url.username || url.password) {
    throw new Error("URLs com usuário ou senha não são aceitas.");
  }

  return url.href;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  message.textContent = "";
  result.classList.add("hidden");

  let originalUrl;

  try {
    originalUrl = normalizeUrl(input.value.trim());
  } catch (error) {
    message.textContent = error.message;
    input.focus();
    return;
  }

  button.disabled = true;
  buttonLabel.textContent = "Encurtando...";
  button.querySelector(".button-arrow").textContent = "↻";

  try {
    const response = await fetch(
      "https://shrtr.top/api/v1/shorten",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: originalUrl
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(
          "Limite de requisições atingido. Aguarde e tente novamente."
        );
      }

      throw new Error(
        data.detail ||
        data.title ||
        data.message ||
        `Erro do serviço (${response.status}).`
      );
    }

    if (!data.short_url) {
      throw new Error("A API não retornou o link encurtado.");
    }

    const parsed = new URL(data.short_url);

    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "shrtr.top"
    ) {
      throw new Error("O serviço retornou um endereço inesperado.");
    }

    currentUrl = parsed.href;
    shortUrl.href = currentUrl;
    shortUrl.textContent = currentUrl;

    if (typeof QRCode === "undefined") {
      throw new Error(
        "A biblioteca de QR Code não carregou. Verifique sua conexão."
      );
    }

    qrContainer.replaceChildren();

    new QRCode(qrContainer, {
      text: currentUrl,
      width: 180,
      height: 180,
      colorDark: "#111827",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });

    result.classList.remove("hidden");

    showToast("Link encurtado com sucesso!");

    result.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  } catch (error) {
    console.error("Erro no Linkora:", error);

    message.textContent =
      error instanceof TypeError
        ? "Falha de conexão ou CORS. Verifique a internet e tente novamente."
        : error.message || "Não foi possível encurtar a URL.";

  } finally {
    button.disabled = false;
    buttonLabel.textContent = "Encurtar minha URL";
    button.querySelector(".button-arrow").textContent = "→";
  }
});

copyButton.addEventListener("click", async () => {
  if (!currentUrl) return;

  try {
    await navigator.clipboard.writeText(currentUrl);
    showToast("Link copiado!");
  } catch {
    const temp = document.createElement("textarea");
    temp.value = currentUrl;
    document.body.appendChild(temp);
    temp.select();

    const copied = document.execCommand("copy");
    temp.remove();

    showToast(
      copied
        ? "Link copiado!"
        : "Copie o link manualmente."
    );
  }
});

downloadButton.addEventListener("click", () => {
  const canvas = qrContainer.querySelector("canvas");
  const image = qrContainer.querySelector("img");

  let dataUrl;

  if (canvas) {
    dataUrl = canvas.toDataURL("image/png");
  } else if (image && image.src.startsWith("data:image/")) {
    dataUrl = image.src;
  }

  if (!dataUrl) {
    showToast("QR Code ainda não está pronto.");
    return;
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = "linkora-qrcode.png";
  link.click();

  showToast("Download iniciado!");
});
