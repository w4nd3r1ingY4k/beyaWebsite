import React, { useState } from 'react';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  reorderLevel: number;
  supplier: string;
  lastUpdated: string;
  imageUrl?: string;
}

// Mock inventory data
const mockProducts: Product[] = [
  {
    id: 'PROD-001',
    name: 'Wireless Bluetooth Headphones',
    sku: 'WBH-2024-001',
    category: 'Electronics',
    price: 79.99,
    stock: 45,
    reorderLevel: 20,
    supplier: 'TechSupply Co.',
    lastUpdated: '2024-01-15',
    imageUrl: '🎧'
  },
  {
    id: 'PROD-002',
    name: 'Organic Cotton T-Shirt',
    sku: 'OCT-2024-002',
    category: 'Apparel',
    price: 24.99,
    stock: 8,
    reorderLevel: 25,
    supplier: 'EcoFashion Ltd.',
    lastUpdated: '2024-01-14',
    imageUrl: '👕'
  },
  {
    id: 'PROD-003',
    name: 'Stainless Steel Water Bottle',
    sku: 'SWB-2024-003',
    category: 'Accessories',
    price: 34.99,
    stock: 120,
    reorderLevel: 50,
    supplier: 'GreenGoods Inc.',
    lastUpdated: '2024-01-15',
    imageUrl: '🍶'
  },
  {
    id: 'PROD-004',
    name: 'Yoga Mat Premium',
    sku: 'YMP-2024-004',
    category: 'Sports',
    price: 49.99,
    stock: 15,
    reorderLevel: 30,
    supplier: 'FitGear Pro',
    lastUpdated: '2024-01-13',
    imageUrl: '🧘'
  },
  {
    id: 'PROD-005',
    name: 'Ceramic Coffee Mug Set',
    sku: 'CCM-2024-005',
    category: 'Home & Kitchen',
    price: 29.99,
    stock: 3,
    reorderLevel: 20,
    supplier: 'HomeStyle Direct',
    lastUpdated: '2024-01-12',
    imageUrl: '☕'
  },
  {
    id: 'PROD-006',
    name: 'USB-C Charging Cable',
    sku: 'UCC-2024-006',
    category: 'Electronics',
    price: 14.99,
    stock: 200,
    reorderLevel: 100,
    supplier: 'TechSupply Co.',
    lastUpdated: '2024-01-15',
    imageUrl: '🔌'
  },
  {
    id: 'PROD-007',
    name: 'Essential Oil Diffuser',
    sku: 'EOD-2024-007',
    category: 'Home & Kitchen',
    price: 44.99,
    stock: 28,
    reorderLevel: 20,
    supplier: 'Wellness World',
    lastUpdated: '2024-01-14',
    imageUrl: '🕯️'
  },
  {
    id: 'PROD-008',
    name: 'Laptop Stand Adjustable',
    sku: 'LSA-2024-008',
    category: 'Office',
    price: 39.99,
    stock: 0,
    reorderLevel: 15,
    supplier: 'OfficeMax Plus',
    lastUpdated: '2024-01-11',
    imageUrl: '💻'
  }
];

const ProductsHome: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(mockProducts.map(p => p.category)))];
  
  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return { text: 'Out of Stock', color: '#EF4444' };
    if (product.stock <= product.reorderLevel) return { text: 'Low Stock', color: '#F59E0B' };
    return { text: 'In Stock', color: '#10B981' };
  };

  const lowStockCount = mockProducts.filter(p => p.stock <= p.reorderLevel && p.stock > 0).length;
  const outOfStockCount = mockProducts.filter(p => p.stock === 0).length;
  const totalValue = mockProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Total Products</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1F2937' }}>{mockProducts.length}</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Active SKUs</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Total Products Value</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10B981' }}>${totalValue.toFixed(2)}</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Current stock value</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Low Stock Alerts</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#F59E0B' }}>{lowStockCount}</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Items need reordering</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Out of Stock</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#EF4444' }}>{outOfStockCount}</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Items unavailable</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search products by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            fontSize: '14px',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>
      </div>

      {/* Products Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filteredProducts.map(product => {
          const stockStatus = getStockStatus(product);
          return (
            <div
              key={product.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: product.stock === 0 ? '2px solid #FEE2E2' : '1px solid transparent'
              }}
              onClick={() => setSelectedProduct(product)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div style={{ fontSize: '48px' }}>{product.imageUrl}</div>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: `${stockStatus.color}20`,
                    color: stockStatus.color
                  }}
                >
                  {stockStatus.text}
                </span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
                {product.name}
              </h3>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                SKU: {product.sku}
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
                Category: {product.category}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#1F2937' }}>${product.price}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>per unit</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: stockStatus.color }}>
                    {product.stock}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>in stock</div>
                </div>
              </div>
              {product.stock <= product.reorderLevel && product.stock > 0 && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px',
                  backgroundColor: '#FEF3C7',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#92400E',
                  textAlign: 'center'
                }}>
                  ⚠️ Reorder needed (below {product.reorderLevel} units)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setSelectedProduct(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '64px', textAlign: 'center', marginBottom: '24px' }}>
              {selectedProduct.imageUrl}
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1F2937', marginBottom: '24px' }}>
              {selectedProduct.name}
            </h2>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>SKU</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: '#1F2937' }}>{selectedProduct.sku}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Category</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: '#1F2937' }}>{selectedProduct.category}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Unit Price</div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: '#1F2937' }}>${selectedProduct.price}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Current Stock</div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: getStockStatus(selectedProduct).color }}>
                    {selectedProduct.stock} units
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Stock Status</div>
                <span style={{
                  padding: '6px 16px',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: `${getStockStatus(selectedProduct).color}20`,
                  color: getStockStatus(selectedProduct).color
                }}>
                  {getStockStatus(selectedProduct).text}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Reorder Level</div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#1F2937' }}>{selectedProduct.reorderLevel} units</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Supplier</div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#1F2937' }}>{selectedProduct.supplier}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Total Value</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#10B981' }}>
                  ${(selectedProduct.price * selectedProduct.stock).toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Last Updated</div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#1F2937' }}>{selectedProduct.lastUpdated}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#DE1785',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Edit Product
              </button>
              <button
                onClick={() => setSelectedProduct(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#F3F4F6',
                  color: '#1F2937',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsHome; 