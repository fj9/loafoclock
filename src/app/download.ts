/** Saves text as a file on the device. */
export function downloadText(name: string, text: string, type: string): void {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}
