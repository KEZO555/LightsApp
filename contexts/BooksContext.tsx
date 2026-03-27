import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Book {
	id: string;
	title: string;
	author: string;
	coverUri: string | null;
	filePath: string;
	progress: number;
	currentCfi: string | null;
	totalLocations: number;
	lastRead: number | null;
	addedAt: number;
}

interface BooksContextType {
	books: Book[];
	addBook: (book: Omit<Book, "id" | "progress" | "currentCfi" | "totalLocations" | "lastRead" | "addedAt">) => Promise<Book>;
	removeBook: (id: string) => Promise<void>;
	updateProgress: (id: string, progress: number, cfi: string, totalLocations: number) => Promise<void>;
	getBook: (id: string) => Book | undefined;
}

const BooksContext = createContext<BooksContextType>({
	books: [],
	addBook: async () => ({} as Book),
	removeBook: async () => {},
	updateProgress: async () => {},
	getBook: () => undefined,
});

export const useBooks = () => useContext(BooksContext);

const STORAGE_KEY = "@lightkindle_books";

export const BooksProvider = ({ children }: { children: ReactNode }) => {
	const [books, setBooks] = useState<Book[]>([]);

	useEffect(() => {
		AsyncStorage.getItem(STORAGE_KEY).then((value) => {
			if (value !== null) {
				setBooks(JSON.parse(value));
			}
		});
	}, []);

	const persist = async (updated: Book[]) => {
		setBooks(updated);
		await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
	};

	const addBook = useCallback(async (bookData: Omit<Book, "id" | "progress" | "currentCfi" | "totalLocations" | "lastRead" | "addedAt">) => {
		const newBook: Book = {
			...bookData,
			id: Date.now().toString(),
			progress: 0,
			currentCfi: null,
			totalLocations: 0,
			lastRead: null,
			addedAt: Date.now(),
		};
		const updated = [...books, newBook];
		await persist(updated);
		return newBook;
	}, [books]);

	const removeBook = useCallback(async (id: string) => {
		const updated = books.filter((b) => b.id !== id);
		await persist(updated);
	}, [books]);

	const updateProgress = useCallback(async (id: string, progress: number, cfi: string, totalLocations: number) => {
		const updated = books.map((b) =>
			b.id === id
				? { ...b, progress, currentCfi: cfi, totalLocations, lastRead: Date.now() }
				: b
		);
		await persist(updated);
	}, [books]);

	const getBook = useCallback((id: string) => {
		return books.find((b) => b.id === id);
	}, [books]);

	return (
		<BooksContext.Provider value={{ books, addBook, removeBook, updateProgress, getBook }}>
			{children}
		</BooksContext.Provider>
	);
};
