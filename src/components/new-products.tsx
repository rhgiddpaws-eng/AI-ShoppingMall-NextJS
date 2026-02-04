'use client'

import { useEffect, useState } from 'react'
import ProductCard from '@/components/product-card'
import { ProductWithImages } from '@/app/api/products/route'

export function NewProducts() {
  const [products, setProducts] = useState<ProductWithImages[]>([])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products?limit=8')
        const data = await response.json()
        setProducts(data)
      } catch (error) {
        console.error('상품을 불러오는데 실패했습니다:', error)
      }
    }

    fetchProducts()
  }, [])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map(product => (
        <ProductCard
          key={product.id}
          id={product.id.toString()}
          name={product.name}
          price={product.price}
          imageSrc={`https://cdn.yes.monster/${product.images[0]?.original}`}
          isNew={true}
        />
      ))}
    </div>
  )
}
