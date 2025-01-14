export class TokenCounter {
  private characterCount = 0;
  private readonly CHARS_PER_TOKEN = 5;

  constructor(private maxTokens: number | undefined) {}

  canAddFile(content: string | undefined): boolean {
    if (!this.maxTokens || !content) return true;
    const potentialCharCount = this.characterCount + content.length;
    const potentialTokens = Math.ceil(
      potentialCharCount / this.CHARS_PER_TOKEN,
    );
    return potentialTokens <= this.maxTokens;
  }

  addFile(content: string | undefined) {
    if (content) {
      this.characterCount += content.length;
    }
  }

  getCurrentTokens(): number {
    return Math.ceil(this.characterCount / this.CHARS_PER_TOKEN);
  }
}
