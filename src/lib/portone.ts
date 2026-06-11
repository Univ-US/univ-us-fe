const PORTONE_SCRIPT_SRC = "https://cdn.portone.io/v2/browser-sdk.js";

export interface PortOnePaymentRequest {
  storeId: string;
  channelKey: string;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency: "CURRENCY_KRW";
  payMethod: "EASY_PAY";
  customer?: {
    fullName?: string;
  };
}

export interface PortOnePaymentResponse {
  code?: string;
  message?: string;
  paymentId?: string;
}

interface PortOneSdk {
  requestPayment(
    paymentRequest: PortOnePaymentRequest,
  ): Promise<PortOnePaymentResponse>;
}

type PortOneWindow = Window & {
  PortOne?: PortOneSdk;
};

export async function loadPortOneSdk() {
  const portOneWindow = window as PortOneWindow;

  if (portOneWindow.PortOne) {
    return portOneWindow.PortOne;
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${PORTONE_SCRIPT_SRC}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = PORTONE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.body.appendChild(script);
  });

  if (!portOneWindow.PortOne) {
    throw new Error("PortOne SDK를 불러오지 못했습니다.");
  }

  return portOneWindow.PortOne;
}
