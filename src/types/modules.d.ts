// 临时模块声明，用于JavaScript模块
declare module 'prismadb' {
  class GestallPrismaDatabase {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    createUser(userData: any): Promise<any>;
    createWork(workData: any): Promise<any>;
    getWorksList(authorId: string): Promise<any[]>;
    createChapter(chapterData: any): Promise<any>;
    getChaptersList(projectId: string): Promise<any[]>;
    updateChapter(chapterId: string, data: any): Promise<any>;
    createContent(contentData: any): Promise<any>;
    getContentsList(workId: string, chapterId?: any): Promise<any[]>;
    updateContent(contentId: string, data: any): Promise<any>;
    getStats(): Promise<any>;
  }
  export = GestallPrismaDatabase;
}

declare module 'ulidgen' {
  class ULIDGenerator {
    static generate(): string;
    static getTimestamp(ulid: string): number;
  }
  export = ULIDGenerator;
}

declare module 'gestell-crypto' {
  class GestallCrypto {
    generateKeyPair(): { publicKey: string; privateKey: string };
    encryptPrivateKey(privateKey: string, password: string): string;
    hashContent(content: string): string;
  }
  export = GestallCrypto;
}