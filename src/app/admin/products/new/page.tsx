"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Upload, X } from "lucide-react"
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

// 이미지 미리보기를 위한 인터페이스
interface ImagePreview {
  file: File
  preview: string
}

export default function CreateProductPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("basic")
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([])
  const [isUploading, setIsUploading] = useState(false)
  
  const [product, setProduct] = useState<ProductForm>({
    name: "",
    description: "",
    price: 0,
    stock: 0,
    discountRate: 0,
    category: "",
  })

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
  const createProductMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      
      try {
        // 1. 먼저 상품 기본 정보 저장
        const response = await fetch("/api/admin/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(product),
        });

        if (!response.ok) {
          throw new Error("상품 기본 정보 저장에 실패했습니다");
        }

        const result: CreateProductResponse = await response.json();
        
        // 2. 모든 이미지 업로드
        const uploadPromises = imagePreviews.map(async (preview) => {
          const uploadResult = await uploadImage(preview.file);
          
          if (!uploadResult) {
            throw new Error(`${preview.file.name} 업로드 실패`);
          }
          
          // 3. 이미지 정보 DB에 저장
          const imageResponse = await fetch(`/api/admin/products/${result.id}/images`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(uploadResult),
          });
          
          if (!imageResponse.ok) {
            throw new Error("이미지 정보 저장 실패");
          }
        });
        
        // 모든 이미지 업로드 및 저장 완료 대기
        await Promise.all(uploadPromises);
        
        return result;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      toast.success("상품이 성공적으로 등록되었습니다");
      router.push("/admin/products");
    },
    onError: (error) => {
      console.error("상품 등록 오류:", error);
      toast.error("상품 등록에 실패했습니다");
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files);
    
    // 파일 크기 및 형식 검증
    const validFiles = newFiles.filter(file => {
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
    // 필수 필드 검증
    if (!product.name) {
      toast.error("상품명을 입력해주세요");
      setActiveTab("basic");
      return;
    }
    
    if (!product.description) {
      toast.error("상품 설명을 입력해주세요");
      setActiveTab("basic");
      return;
    }
    
    if (!product.category) {
      toast.error("카테고리를 선택해주세요");
      setActiveTab("basic");
      return;
    }
    
    if (product.price <= 0) {
      toast.error("상품 가격은 0보다 커야 합니다");
      setActiveTab("basic");
      return;
    }
    
    if (product.stock < 0) {
      toast.error("재고는 0 이상이어야 합니다");
      setActiveTab("basic");
      return;
    }
    
    if (imagePreviews.length === 0) {
      toast.error("최소 한 개 이상의 이미지를 업로드해주세요");
      setActiveTab("images");
      return;
    }
    
    // 상품 생성 시작
    createProductMutation.mutate();
  };

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
            onClick={handleSave} 
            disabled={createProductMutation.isPending || isUploading}
          >
            <Save className="h-4 w-4 mr-2" />
            {createProductMutation.isPending || isUploading ? "처리 중..." : "저장"}
          </Button>
        </div>
      </div>

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
    </div>
  )
} 