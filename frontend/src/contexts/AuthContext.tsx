import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User } from '../lib/api';

interface AuthContextType {
 user: User | null;
 token: string | null;
 login: (token: string, user: User) => void;
 logout: () => void;
 isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
 const [user, setUser] = useState<User | null>(null);
 const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 const initAuth = async () => {
 if (token) {
 try {
 const res = await api.get('/auth/me');
 setUser(res.data);
 } catch {
 setToken(null);
 localStorage.removeItem('token');
 }
 }
 setIsLoading(false);
 };
 initAuth();
 }, [token]);

 const login = (newToken: string, newUser: User) => {
 localStorage.setItem('token', newToken);
 setToken(newToken);
 setUser(newUser);
 };

 const logout = () => {
 localStorage.removeItem('token');
 setToken(null);
 setUser(null);
 };

 return (
 <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
 {children}
 </AuthContext.Provider>
 );
}

export const useAuth = () => {
 const context = useContext(AuthContext);
 if (!context) throw new Error('useAuth must be used within AuthProvider');
 return context;
};