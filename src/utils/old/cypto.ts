export async function importKey(secret: string): Promise<CryptoKey> {
    // Convert the secret string to an ArrayBuffer
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);

    // Import the key data as an HMAC key
    const key = await crypto.subtle.importKey(
        "raw", // raw format of the key
        keyData, // the key data
        { name: "HMAC", hash: "SHA-512" }, // algorithm details
        false, // non-extractable
        ["sign", "verify"] // key usage
    );

    return key;
}

export async function signMessage(key: CryptoKey, message: string): Promise<ArrayBuffer> {
    // Encode the message as an ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    // Sign the message using the HMAC key
    const signature = await crypto.subtle.sign("HMAC", key, data);
    return signature;
}

export async function verifySignature(
    key: CryptoKey,
    signature: ArrayBuffer,
    message: string
): Promise<boolean> {
    // Encode the message as an ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    // Verify the signature
    const isValid = await crypto.subtle.verify("HMAC", key, signature, data);
    return isValid;
}