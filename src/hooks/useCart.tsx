import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);
const localStorageToken = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(localStorageToken);
    //Buscar dados do localStorage

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function updateLocalStorage(newCart: Product[]) {
    try {
      localStorage.setItem(localStorageToken, JSON.stringify(newCart));
    } catch (error) {
      console.error(error);
    }

  }

  const addProduct = async (productId: number) => {
    try {
      let newCart: Product[];
      const productInCart = cart.find((product) => product.id === productId);
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      const amount = productInCart ? productInCart.amount : 0;
      if (amount + 1 > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      if (!productInCart) {
        const { data: product } = await api.get<Product>(`/products/${productId}`);
        newCart = [...cart, { ...product, amount: 1 }];
      } else {
        newCart = cart.map((product) => {
          if (product.id === productInCart.id) {

            return { ...product, amount: product.amount + 1 }

          }
          return { ...product }
        });
      }
      setCart(newCart);
      updateLocalStorage(newCart);

    } catch {
      toast.error("Erro na adição do produto")
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // TODO
      if (!cart.some((product) => product.id === productId))
        throw new Error();
      const newCart = cart.filter((product) => productId !== product.id);
      setCart(newCart);
      updateLocalStorage(newCart);
    } catch {
      // TODO
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0)
      return;

    try {
      // TODO
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const newCart = cart.map((product) => {
        if (product.id === productId)
          return {
            ...product,
            amount
          }
        else
          return { ...product }
      });
      setCart(newCart);
      updateLocalStorage(newCart)
    } catch {
      // TODO
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
