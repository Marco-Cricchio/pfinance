'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { Plus, Edit2, Trash2, Save, X, Eye, Search, Check, ChevronDown } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense' | 'both';
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryRule {
  id: number;
  category_id: number;
  pattern: string;
  match_type: 'contains' | 'startsWith' | 'endsWith';
  priority: number;
  enabled: boolean;
  notes?: string;
  category_name: string;
  category_color: string;
  created_at: string;
  updated_at: string;
}

interface PreviewItem {
  id?: string;
  description: string;
  category: string;
  color?: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [filteredPreview, setFilteredPreview] = useState<PreviewItem[]>([]);
  const [activeTab, setActiveTab] = useState('categories');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection states for bulk operations
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  
  // Form states
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingRule, setEditingRule] = useState<CategoryRule | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', type: 'expense', color: '#8884d8' });
  const [newRule, setNewRule] = useState({ categoryId: '', pattern: '', matchType: 'contains', priority: 0 });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = preview;
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.description.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredPreview(filtered);
    // Reset page and clear selection when filters change
    setCurrentPage(1);
    clearSelection();
  }, [preview, categoryFilter, searchTerm]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Pagination calculations
  const totalItems = filteredPreview.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPreview = filteredPreview.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    clearSelection(); // Clear selection when changing pages
  };

  // Selection management functions
  const handleSelectItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === paginatedPreview.length) {
      // Deselect all
      setSelectedItems(new Set());
      setShowBulkActions(false);
    } else {
      // Select all on current page
      const newSelected = new Set<number>();
      paginatedPreview.forEach((_, index) => newSelected.add(startIndex + index));
      setSelectedItems(newSelected);
      setShowBulkActions(true);
    }
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setShowBulkActions(false);
  };

  // Single transaction update function
  const handleSingleCategoryUpdate = async (description: string, categoryId: number) => {
    try {
      const response = await fetch('/api/transactions/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          categoryId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Categoria aggiornata per ${data.updatedCount} transazione/i`);
        loadData(); // Reload to get updated categories
      } else {
        const data = await response.json();
        setError(data.error || 'Errore durante l\'aggiornamento');
      }
    } catch (error) {
      setError('Errore di rete durante l\'aggiornamento');
    }
  };

  // Bulk update function
  const handleBulkCategoryUpdate = async () => {
    if (!bulkCategoryId || selectedItems.size === 0) {
      setError('Seleziona una categoria e almeno una transazione');
      return;
    }

    try {
      const selectedDescriptions = Array.from(selectedItems).map(index => 
        filteredPreview[index]?.description
      ).filter(Boolean);

      const response = await fetch('/api/transactions/bulk-categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descriptions: selectedDescriptions,
          categoryId: parseInt(bulkCategoryId)
        })
      });

      if (response.ok) {
        setSuccess(`Categoria aggiornata per ${selectedItems.size} transazioni`);
        clearSelection();
        setBulkCategoryId('');
        loadData(); // Reload to get updated categories
      } else {
        const data = await response.json();
        setError(data.error || 'Errore durante l\'aggiornamento bulk');
      }
    } catch (error) {
      setError('Errore di rete durante l\'aggiornamento bulk');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, rulesRes, previewRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/category-rules'),
        fetch('/api/category-rules/preview')
      ]);
      
      const categoriesData = await categoriesRes.json();
      const rulesData = await rulesRes.json();
      const previewData = await previewRes.json();
      
      setCategories(categoriesData.categories || []);
      setRules(rulesData.rules || []);
      setPreview(previewData.preview || []);
      setFilteredPreview(previewData.preview || []);
    } catch (error) {
      setError('Errore durante il caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async () => {
    if (!newCategory.name.trim()) {
      setError('Nome categoria richiesto');
      return;
    }
    
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      });
      
      if (response.ok) {
        setSuccess('Categoria creata con successo');
        setNewCategory({ name: '', type: 'expense', color: '#8884d8' });
        loadData();
      } else {
        const data = await response.json();
        setError(data.error || 'Errore durante la creazione');
      }
    } catch (error) {
      setError('Errore di rete');
    }
  };

  const updateCategory = async (category: Category) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category)
      });
      
      if (response.ok) {
        setSuccess('Categoria aggiornata con successo');
        setEditingCategory(null);
        loadData();
      } else {
        const data = await response.json();
        setError(data.error || 'Errore durante l\'aggiornamento');
      }
    } catch (error) {
      setError('Errore di rete');
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa categoria?')) return;
    
    try {
      const response = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setSuccess('Categoria eliminata con successo');
        loadData();
      } else {
        const data = await response.json();
        setError(data.error || 'Errore durante l\'eliminazione');
      }
    } catch (error) {
      setError('Errore di rete');
    }
  };

  const createRule = async () => {
    if (!newRule.categoryId || !newRule.pattern.trim()) {
      setError('Categoria e pattern richiesti');
      return;
    }
    
    try {
      const response = await fetch('/api/category-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: parseInt(newRule.categoryId),
          pattern: newRule.pattern,
          matchType: newRule.matchType,
          priority: newRule.priority
        })
      });
      
      if (response.ok) {
        setSuccess('Regola creata con successo');
        setNewRule({ categoryId: '', pattern: '', matchType: 'contains', priority: 0 });
        loadData();
      } else {
        const data = await response.json();
        setError(data.error || 'Errore durante la creazione');
      }
    } catch (error) {
      setError('Errore di rete');
    }
  };

  const updateRule = async (rule: CategoryRule) => {
    try {
      const response = await fetch('/api/category-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rule.id,
          pattern: rule.pattern,
          matchType: rule.match_type,
          priority: rule.priority,
          enabled: rule.enabled
        })
      });
      
      if (response.ok) {
        setSuccess('Regola aggiornata con successo');
        setEditingRule(null);
        loadData();
      } else {
        const data = await response.json();
        setError(data.error || 'Errore durante l\'aggiornamento');
      }
    } catch (error) {
      setError('Errore di rete');
    }
  };

  const deleteRule = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa regola?')) return;
    
    try {
      const response = await fetch(`/api/category-rules?id=${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setSuccess('Regola eliminata con successo');
        loadData();
      } else {
        const data = await response.json();
        setError(data.error || 'Errore durante l\'eliminazione');
      }
    } catch (error) {
      setError('Errore di rete');
    }
  };

  const recategorizeAll = async () => {
    if (!confirm('Ricategorizzare tutte le transazioni? Questa operazione potrebbe richiedere del tempo.')) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/recategorize', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccess(`Ricategorizzate ${data.updatedCount} transazioni`);
      } else {
        const data = await response.json();
        setError(data.error || 'Errore durante la ricategorizzazione');
      }
    } catch (error) {
      setError('Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestione Categorie</h1>
        <Button onClick={recategorizeAll} variant="outline">
          Ricategorizza Tutto
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Categorie
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rules'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Regole
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'preview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Anteprima
            </button>
          </nav>
        </div>

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            {/* Create Category Form */}
            <Card>
              <CardHeader>
                <CardTitle>Nuova Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="category-name">Nome</Label>
                    <Input
                      id="category-name"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                      placeholder="Nome categoria"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category-type">Tipo</Label>
                    <select
                      id="category-type"
                      value={newCategory.type}
                      onChange={(e) => setNewCategory({...newCategory, type: e.target.value as any})}
                      className="w-full p-2 border bg-background rounded-md"
                    >
                      <option value="expense">Spesa</option>
                      <option value="income">Entrata</option>
                      <option value="both">Entrambi</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="category-color">Colore</Label>
                    <Input
                      id="category-color"
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={createCategory} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Crea
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Categories List */}
            <Card>
              <CardHeader>
                <CardTitle>Categorie Esistenti</CardTitle>
                <CardDescription>{categories.length} categorie totali</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                      {editingCategory?.id === category.id ? (
                        <div className="flex items-center space-x-4 flex-1">
                          <Input
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                            className="flex-1"
                          />
                          <select
                            value={editingCategory.type}
                            onChange={(e) => setEditingCategory({...editingCategory, type: e.target.value as any})}
                            className="p-2 border bg-background rounded-md"
                          >
                            <option value="expense">Spesa</option>
                            <option value="income">Entrata</option>
                            <option value="both">Entrambi</option>
                          </select>
                          <Input
                            type="color"
                            value={editingCategory.color}
                            onChange={(e) => setEditingCategory({...editingCategory, color: e.target.value})}
                            className="w-16"
                          />
                          <Button size="sm" onClick={() => updateCategory(editingCategory)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center space-x-4">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="font-medium">{category.name}</span>
                            <Badge variant={category.type === 'income' ? 'default' : 'secondary'}>
                              {category.type === 'income' ? 'Entrata' : category.type === 'expense' ? 'Spesa' : 'Entrambi'}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingCategory(category)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteCategory(category.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            {/* Create Rule Form */}
            <Card>
              <CardHeader>
                <CardTitle>Nuova Regola</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="rule-category">Categoria</Label>
                    <select
                      id="rule-category"
                      value={newRule.categoryId}
                      onChange={(e) => setNewRule({...newRule, categoryId: e.target.value})}
                      className="w-full p-2 border bg-background rounded-md"
                    >
                      <option value="">Seleziona categoria</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="rule-pattern">Pattern</Label>
                    <Input
                      id="rule-pattern"
                      value={newRule.pattern}
                      onChange={(e) => setNewRule({...newRule, pattern: e.target.value})}
                      placeholder="testo da cercare"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rule-match-type">Tipo Match</Label>
                    <select
                      id="rule-match-type"
                      value={newRule.matchType}
                      onChange={(e) => setNewRule({...newRule, matchType: e.target.value as any})}
                      className="w-full p-2 border bg-background rounded-md"
                    >
                      <option value="contains">Contiene</option>
                      <option value="startsWith">Inizia con</option>
                      <option value="endsWith">Finisce con</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="rule-priority">Priorità</Label>
                    <Input
                      id="rule-priority"
                      type="number"
                      value={newRule.priority}
                      onChange={(e) => setNewRule({...newRule, priority: parseInt(e.target.value) || 0})}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={createRule} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Crea
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rules List */}
            <Card>
              <CardHeader>
                <CardTitle>Regole Esistenti</CardTitle>
                <CardDescription>{rules.length} regole totali</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                      {editingRule?.id === rule.id ? (
                        <div className="flex items-center space-x-4 flex-1">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: rule.category_color }}
                          />
                          <Badge variant="outline">{rule.category_name}</Badge>
                          <Input
                            value={editingRule.pattern}
                            onChange={(e) => setEditingRule({...editingRule, pattern: e.target.value})}
                            className="flex-1"
                            placeholder="Pattern"
                          />
                          <select
                            value={editingRule.match_type}
                            onChange={(e) => setEditingRule({...editingRule, match_type: e.target.value as any})}
                            className="p-2 border bg-background rounded-md"
                          >
                            <option value="contains">Contiene</option>
                            <option value="startsWith">Inizia con</option>
                            <option value="endsWith">Finisce con</option>
                          </select>
                          <Input
                            type="number"
                            value={editingRule.priority}
                            onChange={(e) => setEditingRule({...editingRule, priority: parseInt(e.target.value) || 0})}
                            className="w-20"
                            placeholder="Priorità"
                          />
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editingRule.enabled}
                              onChange={(e) => setEditingRule({...editingRule, enabled: e.target.checked})}
                            />
                            <span className="text-sm">Attiva</span>
                          </label>
                          <Button size="sm" onClick={() => updateRule(editingRule)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingRule(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center space-x-4">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: rule.category_color }}
                            />
                            <Badge variant="outline">{rule.category_name}</Badge>
                            <code className="bg-custom-pattern px-2 py-1 rounded text-sm">{rule.pattern}</code>
                            <Badge variant={rule.match_type === 'contains' ? 'default' : 'secondary'}>
                              {rule.match_type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">Priorità: {rule.priority}</span>
                            <Badge variant={rule.enabled ? 'default' : 'destructive'}>
                              {rule.enabled ? 'Attiva' : 'Disattivata'}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingRule(rule)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteRule(rule.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <Card>
            <CardHeader>
              <CardTitle>Anteprima Categorizzazione</CardTitle>
              <CardDescription>
                {totalItems > 0 ? `${totalItems} transazioni trovate` : 'Nessuna transazione disponibile'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category-filter">Filtra per categoria</Label>
                  <select
                    id="category-filter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full p-2 border bg-background rounded-md mt-1"
                  >
                    <option value="all">Tutte le categorie</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="search-filter">Cerca nelle descrizioni</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="search-filter"
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cerca transazioni..."
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              
              {/* Active Filters Display */}
              {(searchTerm.trim() || categoryFilter !== 'all') && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Filtri attivi:</span>
                  {categoryFilter !== 'all' && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      Categoria: {categoryFilter}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => setCategoryFilter('all')}
                      />
                    </Badge>
                  )}
                  {searchTerm.trim() && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      Ricerca: "{searchTerm.trim()}"
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => setSearchTerm('')}
                      />
                    </Badge>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setCategoryFilter('all');
                      setSearchTerm('');
                    }}
                    className="text-xs"
                  >
                    Pulisci tutti
                  </Button>
                </div>
              )}
              
              {/* Bulk Actions Interface */}
              {paginatedPreview.length > 0 && (
                <div className="mb-4 p-4 bg-muted rounded-lg border">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === paginatedPreview.length && paginatedPreview.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border"
                      />
                      <Label className="text-sm font-medium">
                        {selectedItems.size === paginatedPreview.length && paginatedPreview.length > 0
                          ? 'Deseleziona tutto'
                          : 'Seleziona tutto'}
                      </Label>
                      {selectedItems.size > 0 && (
                        <Badge variant="secondary">{selectedItems.size} selezionate</Badge>
                      )}
                    </div>
                    
                    {showBulkActions && (
                      <div className="flex items-center gap-2 ml-auto">
                        <Label className="text-sm">Assegna categoria:</Label>
                        <select
                          value={bulkCategoryId}
                          onChange={(e) => setBulkCategoryId(e.target.value)}
                          className="p-2 border bg-background rounded-md text-sm"
                        >
                          <option value="">Seleziona categoria</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <Button 
                          size="sm" 
                          onClick={handleBulkCategoryUpdate}
                          disabled={!bulkCategoryId}
                        >
                          Applica
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={clearSelection}
                        >
                          Annulla
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                {paginatedPreview.map((item, index) => {
                  const itemIndex = startIndex + index;
                  return (
                    <div key={itemIndex} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedItems.has(itemIndex)}
                        onChange={() => handleSelectItem(itemIndex)}
                        className="rounded border"
                      />
                      
                      {/* Transaction Description */}
                      <code className="text-sm flex-1 min-w-0">{item.description}</code>
                      
                      {/* Current Category Badge */}
                      <Badge 
                        style={{ 
                          backgroundColor: item.color || '#74b9ff',
                          color: 'white'
                        }}
                        className="shrink-0"
                      >
                        {item.category}
                      </Badge>
                      
                      {/* Individual Category Assignment */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          onChange={(e) => {
                            const categoryId = parseInt(e.target.value);
                            if (categoryId && !isNaN(categoryId)) {
                              handleSingleCategoryUpdate(item.description, categoryId);
                            }
                          }}
                          className="text-xs p-1 border rounded text-muted-foreground bg-background hover:bg-muted/50 transition-colors"
                          defaultValue=""
                        >
                          <option value="">Cambia</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
                {filteredPreview.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    {searchTerm.trim() || categoryFilter !== 'all' 
                      ? 'Nessuna transazione trovata per i filtri selezionati'
                      : 'Nessuna transazione disponibile'
                    }
                  </div>
                )}
              </div>
              
              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
              />
            </CardContent>
          </Card>
        )}
      </Tabs>
    </div>
  );
}
