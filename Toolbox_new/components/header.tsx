import React, { useState, useEffect } from "react"
import { Search, Package, ShoppingCart, X } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { ThemeToggle } from "./theme-toggle"
import type { ViewType } from "../app/page"

interface HeaderProps {
  cartItemCount: number
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  onSearch?: (query: string) => void
}

export function Header({ cartItemCount, currentView, onViewChange, onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [products, setProducts] = useState<Array<{id: string, name: string, brand: string, itemType: string}>>([])
  
  // Load products for autocomplete
  useEffect(() => {
    const loadProductsForSearch = () => {
      try {
        const cached = localStorage.getItem('cached-products')
        if (cached) {
          const productData = JSON.parse(cached)
          setProducts(productData.map((p: any) => ({
            id: p.id || p.item_no,
            name: p.name || p.item_name || 'Unknown',
            brand: p.brand || 'Unknown',
            itemType: p.itemType || p.item_type || 'General'
          })))
        }
      } catch (error) {
        console.warn('Failed to load products for search:', error)
      }
    }
    loadProductsForSearch()
  }, [])
  
  // Generate smart suggestions
  const suggestions = React.useMemo(() => {
    if (searchQuery.length < 2) return []
    
    const query = searchQuery.toLowerCase()
    const matches = new Set<string>()
    
    products.forEach(product => {
      if (product.name.toLowerCase().includes(query)) {
        matches.add(product.name)
      }
      if (product.brand.toLowerCase().includes(query)) {
        matches.add(`${product.brand} (Brand)`)
      }
      if (product.itemType.toLowerCase().includes(query)) {
        matches.add(`${product.itemType} (Category)`)
      }
    })
    
    return Array.from(matches).slice(0, 5)
  }, [searchQuery, products])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (onSearch) {
        onSearch(searchQuery)
      }
    }, 300)

    return () => clearTimeout(delayedSearch)
  }, [searchQuery, onSearch])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(value.length > 0)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setShowSuggestions(false)
    if (onSearch) {
      onSearch("")
    }
  }

  const selectSuggestion = (suggestion: string) => {
    const cleanSuggestion = suggestion.replace(/\s*\([^)]*\)\s*$/, '')
    setSearchQuery(cleanSuggestion)
    setShowSuggestions(false)
    if (onSearch) {
      onSearch(cleanSuggestion)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-b border-slate-700/50 shadow-lg">
      <div className="flex items-center justify-between px-4 py-2.5 max-w-7xl mx-auto gap-4">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer shrink-0 group" 
          onClick={() => onViewChange("dashboard")}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-blue-500 rounded-xl blur-sm opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center border border-slate-600/50 shadow-md overflow-hidden">
              <img 
                src="/ToolBoxlogo.png" 
                alt="Toolbox Logo" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <Package className="w-5 h-5 text-teal-400 hidden" />
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-lg text-white tracking-wide">TOOLBOX</span>
            <p className="text-[10px] text-slate-400 -mt-0.5">Inventory System</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search items, brands, categories..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowSuggestions(searchQuery.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-10 pr-10 h-10 bg-slate-800/60 border border-slate-600/50 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-teal-500/50 focus-visible:border-teal-500/50 rounded-xl"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          </div>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 rounded-xl shadow-xl border border-slate-600/50 overflow-hidden z-50">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => selectSuggestion(suggestion)}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700/50 transition-colors flex items-center gap-3"
                >
                  <Search className="w-4 h-4 text-slate-400" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          
          {/* Navigation */}
          <div className="flex items-center bg-slate-800/60 rounded-full p-1 gap-0.5 border border-slate-700/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewChange("dashboard")}
              className={`rounded-full px-3 sm:px-4 h-8 text-sm font-medium transition-all ${
                currentView === "dashboard" 
                  ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md" 
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <Package className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Items</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewChange("cart")}
              className={`rounded-full px-3 sm:px-4 h-8 text-sm font-medium transition-all relative ${
                currentView === "cart" 
                  ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md" 
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <ShoppingCart className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Cart</span>
              {cartItemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 rounded-full shadow-md">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
