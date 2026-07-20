declare module "qrcode" {
  type QrOptions = {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    width?: number;
  };

  const QRCode: {
    toBuffer(text: string, options?: QrOptions): Promise<Buffer>;
  };

  export default QRCode;
}
