"use client"
// =============================================================================
// 관리자 신규 상품 등록 - /admin/products/new
// 기본 정보·이미지 탭, 임시저장(DRAFT), 저장(발행), 취소 시 롤백
// =============================================================================

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Upload, X, Loader2 } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Category } from "@prisma/client"
import { CreateProductResponse } from "@/app/api/admin/products/route"

interface ProductForm {
  name: string
  description: string
  price: number
  stock: number
  discountRate: number
  category: Category | string
}

/** 신규 상품 등록: 기본정보 + 이미지 업로드(Presigned URL), 임시저장/저장, 취소 시 롤백 */

// 이미지 미리보기를 위한 인터페이스
interface ImagePreview {
  file: File
  preview: string
}

const ROLLBACK_URL = "/api/admin/products/rollback"

export default function CreateProductPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("basic")
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isRollingBack, setIsRollingBack] = useState(false)
  const createdProductIdsRef = useRef<number[]>([])
  const uploadedCdnKeysRef = useRef<string[]>([])

  const [product, setProduct] = useState<ProductForm>({
    name: "",
    description: "",
    price: 0,
    stock: 0,
    discountRate: 0,
    category: "",
  })

  type BatchRow = { name: string; description: string; price: number; stock: number; category: string; files: File[] }
  const [batchRows, setBatchRows] = useState<BatchRow[]>([
    { name: "", description: "", price: 0, stock: 0, category: "", files: [] },
  ])
  const [registrationMode, setRegistrationMode] = useState<"single" | "batch">("single")

  // 이미지 압축 함수 (Canvas API 사용)
  const compressImage = async (file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // 비율 유지하면서 크기 조정
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx?.drawImage(img, 0, 0, width, height);
          
          // 이미지 포맷 결정 (원본 유지 또는 webp)
          const mimeType = file.type === 'image/gif' ? 'image/gif' : 'image/webp';
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('이미지 압축 실패'));
              }
            },
            mimeType,
            quality
          );
        };
        
        img.onerror = () => {
          reject(new Error('이미지 로딩 실패'));
        };
      };
      
      reader.onerror = () => {
        reject(new Error('파일 읽기 실패'));
      };
    });
  };

  // 썸네일 생성 함수
  const createThumbnail = async (file: File, maxWidth = 300, quality = 0.7): Promise<Blob> => {
    return compressImage(file, maxWidth, quality);
  };

  const callRollback = async (productIds: number[], cdnKeys: string[]) => {
    if (productIds.length === 0 && cdnKeys.length === 0) return
    try {
      const res = await fetch(ROLLBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds, cdnKeys }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error ?? "롤백 요청 실패")
      }
    } catch (e) {
      console.error("Rollback error:", e)
      toast.error("롤백 요청 중 오류가 발생했습니다")
    } finally {
      setIsRollingBack(false)
    }
  }

  useEffect(() => {
    const onBeforeUnload = () => {
      const ids = createdProductIdsRef.current
      const keys = uploadedCdnKeysRef.current
      if (ids.length > 0 || keys.length > 0) {
        fetch(ROLLBACK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: ids, cdnKeys: keys }),
          keepalive: true,
        }).catch(() => {})
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [])

  // 이미지 업로드 함수
  const uploadImage = async (file: File): Promise<{ original: string, thumbnail: string } | null> => {
    try {
      // 1. 원본 이미지 압축
      const compressedImage = await compressImage(file);
      
      // 2. 썸네일 생성
      const thumbnailImage = await createThumbnail(file);
      
      // 3. 원본 이미지 업로드용 Presigned URL 요청
      const originalResponse = await fetch(
        `/api/presignedUrl?fileType=${file.type}&bucketPath=products`,
        { method: "GET" }
      );
      
      if (!originalResponse.ok) {
        throw new Error("원본 이미지 업로드 URL 발급 실패");
      }
      
      const { uploadUrl: originalUploadUrl, key: originalKey } = await originalResponse.json();
      
      // 4. 썸네일 업로드용 Presigned URL 요청
      const thumbnailResponse = await fetch(
        `/api/presignedUrl?fileType=${file.type === 'image/gif' ? 'image/gif' : 'image/webp'}&bucketPath=products/thumbnails`,
        { method: "GET" }
      );
      
      if (!thumbnailResponse.ok) {
        throw new Error("썸네일 업로드 URL 발급 실패");
      }
      
      const { uploadUrl: thumbnailUploadUrl, key: thumbnailKey } = await thumbnailResponse.json();
      
      // 5. 원본 이미지 업로드
      const originalUploadResponse = await fetch(originalUploadUrl, {
        method: "PUT",
        body: compressedImage,
        headers: {
          "Content-Type": file.type,
        },
      });
      
      if (!originalUploadResponse.ok) {
        throw new Error("원본 이미지 업로드 실패");
      }
      
      // 6. 썸네일 업로드
      const thumbnailUploadResponse = await fetch(thumbnailUploadUrl, {
        method: "PUT",
        body: thumbnailImage,
        headers: {
          "Content-Type": file.type === 'image/gif' ? 'image/gif' : 'image/webp',
        },
      });
      
      if (!thumbnailUploadResponse.ok) {
        throw new Error("썸네일 업로드 실패");
      }
      
      return {
        original: originalKey,
        thumbnail: thumbnailKey
      };
    } catch (error) {
      console.error("이미지 업로드 중 오류 발생:", error);
      return null;
    }
  };

  // 상품 생성 뮤테이션
  // useMutation은 React Query(또는 TanStack Query)의 훅으로, 
  // 서버에 데이터를 "변경"(생성, 수정, 삭제)할 때 사용합니다.
  // 여기서는 "신규 상품 생성"을 위해 서버에 POST 요청을 보내는 작업(그리고 뒤따르는 이미지 업로드 등) 
  // 전체를 하나의 mutation으로 관리합니다.
  // 이 훅을 쓰면 isLoading 등 상태 관리, 요청에 따른 성공/실패 콜백 처리 등이 간결하게 가능해집니다.
  const createProductMutation = useMutation({
    mutationFn: async () => {
      createdProductIdsRef.current = []
      uploadedCdnKeysRef.current = []
      setIsUploading(true)

      try {
        const response = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        })

        if (!response.ok) {
          throw new Error("상품 기본 정보 저장에 실패했습니다")
        }

        const result: CreateProductResponse = await response.json()
        createdProductIdsRef.current.push(result.id)

        for (const preview of imagePreviews) {
          const uploadResult = await uploadImage(preview.file)
          if (!uploadResult) {
            throw new Error(`${preview.file.name} 업로드 실패`)
          }
          uploadedCdnKeysRef.current.push(uploadResult.original, uploadResult.thumbnail)

          const imageResponse = await fetch(`/api/admin/products/${result.id}/images`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(uploadResult),
          })
          if (!imageResponse.ok) {
            throw new Error("이미지 정보 저장 실패")
          }
        }

        return result
      } catch (err) {
        const ids = [...createdProductIdsRef.current]
        const keys = [...uploadedCdnKeysRef.current]
        createdProductIdsRef.current = []
        uploadedCdnKeysRef.current = []
        if (ids.length > 0 || keys.length > 0) {
          setIsRollingBack(true)
          await callRollback(ids, keys)
        }
        throw err
      } finally {
        setIsUploading(false)
      }
    },
    onSuccess: () => {
      createdProductIdsRef.current = []
      uploadedCdnKeysRef.current = []
      toast.success("상품이 성공적으로 등록되었습니다")
      router.push("/admin/products")
    },
    onError: (error) => {
      console.error("상품 등록 오류:", error)
      toast.error("상품 등록에 실패했습니다")
    },
  })

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...product, isDraft: true }),
      })
      if (!response.ok) throw new Error("임시 저장에 실패했습니다")
      return response.json() as Promise<CreateProductResponse>
    },
    onSuccess: (data) => {
      toast.success("임시 저장되었습니다")
      router.push(`/admin/products/${data.id}`)
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "임시 저장 실패")
    },
  })

  const handleCancelUpload = () => {
    const ids = [...createdProductIdsRef.current]
    const keys = [...uploadedCdnKeysRef.current]
    createdProductIdsRef.current = []
    uploadedCdnKeysRef.current = []
    if (ids.length > 0 || keys.length > 0) {
      setIsRollingBack(true)
      callRollback(ids, keys)
    }
    setIsUploading(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files);
    
    // 파일 크기 및 형식 검증
    const validFiles = newFiles.filter( file => {
      
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      const isValidType = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type);
      
      if (!isValidSize) toast.error(`${file.name}의 크기가 너무 큽니다 (최대 5MB)`);
      if (!isValidType) toast.error(`${file.name}의 형식이 지원되지 않습니다`);
      
      return isValidSize && isValidType;
    });
    
    // 새 이미지 미리보기 생성
    const newPreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    
    // 이미지 미리보기가 되는 원리:
    // 브라우저의 URL.createObjectURL(file)을 사용하면 사용자의 로컬 파일 객체(file)에 대해 
    // 임시로 접근 가능한 URL을 만들어줌.
    // 이 URL을 <img src="..."> 같은 곳에 넣으면 사용자의 실제 파일을 서버로 전송하지 않아도 
    // 화면에 바로 미리보기 이미지로 보여줄 수 있음.
    // 즉, 업로드 전 이미지 파일 내용을 blob URL로 브라우저가 직접 읽어와서 화면에 표시하는 것.
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    // 미리보기 URL 객체 해제
    URL.revokeObjectURL(imagePreviews[index].preview);
    
    // 이미지 및 미리보기 제거
    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  const handleSave = async () => {
    if (!product.name) {
      toast.error("상품명을 입력해주세요")
      setActiveTab("basic")
      return
    }
    if (!product.description) {
      toast.error("상품 설명을 입력해주세요")
      setActiveTab("basic")
      return
    }
    if (!product.category) {
      toast.error("카테고리를 선택해주세요")
      setActiveTab("basic")
      return
    }
    if (product.price <= 0) {
      toast.error("상품 가격은 0보다 커야 합니다")
      setActiveTab("basic")
      return
    }
    if (product.stock < 0) {
      toast.error("재고는 0 이상이어야 합니다")
      setActiveTab("basic")
      return
    }
    if (imagePreviews.length === 0) {
      toast.error("최소 한 개 이상의 이미지를 업로드해주세요")
      setActiveTab("images")
      return
    }
    createProductMutation.mutate()
  }

  const handleSaveDraft = () => {
    if (!product.name) {
      toast.error("상품명을 입력해주세요")
      setActiveTab("basic")
      return
    }
    if (!product.category) {
      toast.error("카테고리를 선택해주세요")
      setActiveTab("basic")
      return
    }
    if (product.price < 0) {
      toast.error("상품 가격은 0 이상이어야 합니다")
      setActiveTab("basic")
      return
    }
    if (product.stock < 0) {
      toast.error("재고는 0 이상이어야 합니다")
      setActiveTab("basic")
      return
    }
    saveDraftMutation.mutate()
  }

  const addBatchRow = () => {
    setBatchRows((prev) => [...prev, { name: "", description: "", price: 0, stock: 0, category: "", files: [] }])
  }
  const updateBatchRow = (index: number, field: keyof BatchRow, value: unknown) => {
    setBatchRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }
  const removeBatchRow = (index: number) => {
    if (batchRows.length <= 1) return
    setBatchRows((prev) => prev.filter((_, i) => i !== index))
  }

  const batchUploadMutation = useMutation({
    mutationFn: async () => {
      createdProductIdsRef.current = []
      uploadedCdnKeysRef.current = []
      setIsUploading(true)
      try {
        const created: number[] = []
        for (let i = 0; i < batchRows.length; i++) {
          const row = batchRows[i]
          if (!row.name || !row.category) throw new Error(`${i + 1}번째 행: 상품명과 카테고리는 필수입니다`)
          const res = await fetch("/api/admin/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: row.name,
              description: row.description || "",
              price: row.price || 0,
              stock: row.stock ?? 0,
              discountRate: 0,
              category: row.category,
            }),
          })
          if (!res.ok) throw new Error(`${i + 1}번째 상품 생성 실패`)
          const result: CreateProductResponse = await res.json()
          created.push(result.id)
          createdProductIdsRef.current.push(result.id)
          for (const file of row.files) {
            const uploadResult = await uploadImage(file)
            if (!uploadResult) throw new Error(`${i + 1}번째 상품 이미지 업로드 실패`)
            uploadedCdnKeysRef.current.push(uploadResult.original, uploadResult.thumbnail)
            const imgRes = await fetch(`/api/admin/products/${result.id}/images`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(uploadResult),
            })
            if (!imgRes.ok) throw new Error(`${i + 1}번째 상품 이미지 저장 실패`)
          }
        }
        return created
      } catch (err) {
        const ids = [...createdProductIdsRef.current]
        const keys = [...uploadedCdnKeysRef.current]
        createdProductIdsRef.current = []
        uploadedCdnKeysRef.current = []
        if (ids.length > 0 || keys.length > 0) {
          setIsRollingBack(true)
          await callRollback(ids, keys)
        }
        throw err
      } finally {
        setIsUploading(false)
      }
    },
    onSuccess: (ids) => {
      createdProductIdsRef.current = []
      uploadedCdnKeysRef.current = []
      toast.success(`${ids.length}건 등록되었습니다`)
      router.push("/admin/products")
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "일괄 등록 실패")
    },
  })

  const handleBatchSubmit = () => {
    const hasValid = batchRows.some((r) => r.name.trim() && r.category)
    if (!hasValid) {
      toast.error("최소 한 행에 상품명과 카테고리를 입력해주세요")
      return
    }
    batchUploadMutation.mutate()
  }

  // handleSave 함수: 필수 필드(상품명, 설명, 카테고리, 가격, 재고, 이미지) 검증 후 
  // 상품 생성 mutation 실행
  // (react-query의 useMutation을 이용)
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">뒤로 가기</span>
          </Button>
          <h1 className="text-2xl font-bold">신규 상품 등록</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saveDraftMutation.isPending || isUploading || isRollingBack}
          >
            {saveDraftMutation.isPending ? "저장 중..." : "임시 저장"}
          </Button>
          <Button
            onClick={handleSave}
            disabled={createProductMutation.isPending || isUploading || isRollingBack}
          >
            {createProductMutation.isPending || isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {createProductMutation.isPending || isUploading ? "처리 중..." : "저장"}
          </Button>
          {(isUploading || isRollingBack) && (
            <Button
              variant="destructive"
              onClick={handleCancelUpload}
              disabled={isRollingBack}
            >
              {isRollingBack ? "롤백 중..." : "취소"}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={registrationMode} onValueChange={(v) => setRegistrationMode(v as "single" | "batch")} className="mb-4">
        <TabsList>
          <TabsTrigger value="single">단일 등록</TabsTrigger>
          <TabsTrigger value="batch">일괄 등록</TabsTrigger>
        </TabsList>
      </Tabs>

      {registrationMode === "batch" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>일괄 등록</CardTitle>
            <p className="text-sm text-muted-foreground">각 행에 상품 정보와 이미지를 입력한 뒤 일괄 등록하세요. 취소 시 이번에 생성한 항목만 롤백됩니다.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {batchRows.map((row, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">상품 {index + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeBatchRow(index)} disabled={batchRows.length <= 1}>행 제거</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>상품명 *</Label>
                    <Input value={row.name} onChange={(e) => updateBatchRow(index, "name", e.target.value)} placeholder="상품명" />
                  </div>
                  <div>
                    <Label>카테고리 *</Label>
                    <Select value={row.category} onValueChange={(v) => updateBatchRow(index, "category", v)}>
                      <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEN">남성</SelectItem>
                        <SelectItem value="WOMEN">여성</SelectItem>
                        <SelectItem value="ACCESSORIES">액세서리</SelectItem>
                        <SelectItem value="SHOES">신발</SelectItem>
                        <SelectItem value="SALE">세일</SelectItem>
                        <SelectItem value="NEW">신상품</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>가격</Label>
                    <Input type="number" value={row.price || ""} onChange={(e) => updateBatchRow(index, "price", Number(e.target.value) || 0)} min={0} />
                  </div>
                  <div>
                    <Label>재고</Label>
                    <Input type="number" value={row.stock ?? ""} onChange={(e) => updateBatchRow(index, "stock", Number(e.target.value) ?? 0)} min={0} />
                  </div>
                </div>
                <div>
                  <Label>설명</Label>
                  <Textarea value={row.description} onChange={(e) => updateBatchRow(index, "description", e.target.value)} rows={2} placeholder="선택 입력" />
                </div>
                <div>
                  <Label>이미지</Label>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : []
                      updateBatchRow(index, "files", files)
                    }}
                  />
                  {row.files.length > 0 && <span className="text-xs text-muted-foreground">{row.files.length}개 파일</span>}
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addBatchRow}>행 추가</Button>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleBatchSubmit}
                disabled={batchUploadMutation.isPending || isUploading || isRollingBack}
              >
                {(batchUploadMutation.isPending || isUploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                일괄 등록
              </Button>
              {(isUploading || isRollingBack) && (
                <Button variant="destructive" onClick={handleCancelUpload} disabled={isRollingBack}>
                  {isRollingBack ? "롤백 중..." : "취소"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {registrationMode === "single" && (
      <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="basic">기본 정보</TabsTrigger>
          <TabsTrigger value="images">이미지</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">상품명 *</Label>
                  <Input
                    id="name"
                    value={product.name}
                    onChange={(e) => setProduct({ ...product, name: e.target.value })}
                    placeholder="상품명을 입력하세요"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">카테고리 *</Label>
                  <Select
                    value={product.category}
                    onValueChange={(value) => setProduct({ ...product, category: value as Category })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEN">남성</SelectItem>
                      <SelectItem value="WOMEN">여성</SelectItem>
                      <SelectItem value="ACCESSORIES">액세서리</SelectItem>
                      <SelectItem value="SHOES">신발</SelectItem>
                      <SelectItem value="SALE">세일</SelectItem>
                      <SelectItem value="NEW">신상품</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">상품 설명 *</Label>
                <Textarea
                  id="description"
                  rows={5}
                  value={product.description}
                  onChange={(e) => setProduct({ ...product, description: e.target.value })}
                  placeholder="상세한 상품 설명을 입력하세요"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">가격 (원) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={product.price}
                    onChange={(e) => setProduct({ ...product, price: Number(e.target.value) })}
                    min={0}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">재고 *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={product.stock}
                    onChange={(e) => setProduct({ ...product, stock: Number(e.target.value) })}
                    min={0}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discountRate">할인율 (%)</Label>
                  <Input
                    id="discountRate"
                    type="number"
                    value={product.discountRate}
                    onChange={(e) => setProduct({ ...product, discountRate: Number(e.target.value) })}
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>상품 이미지</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="imageUpload" className="cursor-pointer">
                  <div className="border border-dashed rounded-lg p-8 flex flex-col items-center justify-center">
                    <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">이미지 파일을 드래그하거나 클릭하여 업로드</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF, WEBP 형식 (최대 5MB)</p>
                  </div>
                  <Input
                    id="imageUpload"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </Label>
              </div>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {imagePreviews.map((image, index) => (
                    <div key={index} className="relative border rounded-lg overflow-hidden h-40">
                      <img
                        src={image.preview}
                        alt={`미리보기 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </div>
  )
} 