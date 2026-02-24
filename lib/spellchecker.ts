import nspell from 'nspell';

class SpellCheckerService {
    private instances: Record<string, any> = {};
    private loading: Record<string, Promise<any>> = {};

    private async fetchDictionaryData(lang: string): Promise<{ aff: string; dic: string }> {
        const affRes = await fetch(`/dictionaries/${lang}/index.aff`);
        const dicRes = await fetch(`/dictionaries/${lang}/index.dic`);

        if (!affRes.ok || !dicRes.ok) {
            throw new Error(`Failed to fetch dictionary for ${lang}`);
        }

        const aff = await affRes.text();
        const dic = await dicRes.text();

        return { aff, dic };
    }

    async getSpellChecker(lang: string = 'es'): Promise<any | null> {
        // Map common codes
        let code = lang.split('-')[0].toLowerCase();
        const supported = ['en', 'es', 'ca', 'de', 'fr', 'pt'];
        if (!supported.includes(code)) code = 'en'; // fallback

        if (this.instances[code] !== undefined) return this.instances[code];
        if (this.loading[code] !== undefined) return this.loading[code];

        const loader = async () => {
            try {
                const data = await this.fetchDictionaryData(code);
                const sp = (nspell as any)(data.aff, data.dic);
                this.instances[code] = sp;
                return sp;
            } catch (error) {
                console.error(`Failed to load dictionary for ${code}:`, error);
                return null;
            } finally {
                delete this.loading[code];
            }
        };

        this.loading[code] = loader();
        return this.loading[code];
    }

    async getSuggestions(word: string, lang: string = 'es', customWords: string[] = []): Promise<string[]> {
        try {
            const sp = await this.getSpellChecker(lang);
            if (!sp) return [];

            // Add custom words from tenant dictionary if they are not already known
            customWords.forEach(w => {
                try { sp.add(w); } catch (e) { /* ignore duplication errors */ }
            });

            if (sp.correct(word)) return [];
            return sp.suggest(word);
        } catch (e) {
            console.error('Spell check suggestion error:', e);
            return [];
        }
    }

    async checkWord(word: string, lang: string = 'es', customWords: string[] = []): Promise<boolean> {
        try {
            const sp = await this.getSpellChecker(lang);
            if (!sp) return true; // Assume correct if loader fails to not annoy user

            // Add custom words
            customWords.forEach(w => {
                try { sp.add(w); } catch (e) { /* ignore */ }
            });

            return sp.correct(word);
        } catch {
            return true;
        }
    }
}

export const spellCheckerService = new SpellCheckerService();
