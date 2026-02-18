"use client"
// =============================================================================
// 관리자 신규 상품 등록 - /admin/products/new
// 기본 정보·미디어 탭, 임시저장(DRAFT), 저장(발행), 취소 시 롤백
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
import { Category } from "@/lib/orderEnums"
import { CreateProductResponse } from "@/app/api/admin/products/route"
import { isVideoMediaPath } from "@/lib/media"

interface ProductForm {
  name: string
  description: string
  price: number
  stock: number
  discountRate: number
  category: Category | string
}

/** 신규 상품 등록: 기본정보 + 미디어 업로드(Presigned URL), 임시저장/저장, 취소 시 롤백 */

// 업로드 허용 타입/용량 정책입니다.
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024

// 미리보기 렌더링에 필요한 파일+URL 묶음 타입입니다.
interface MediaPreview {
  file: File
  preview: string
}

// Presigned URL 응답 타입입니다.
interface PresignedUploadResponse {
  uploadUrl: string
  key: string
  alreadyExists: boolean
}

// 업로드 결과와 DB 저장 여부를 함께 반환합니다.
interface UploadMediaResult {
  original: string
  thumbnail: string
  // DB enum과 동일하게 image/video 문자열로 미디어 타입을 전달합니다.
  mediaType: "image" | "video"
  shouldCreateDbRecord: boolean
  rollbackKeys: string[]
}

const ROLLBACK_URL = "/api/admin/products/rollback"

export default function CreateProductPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("basic")
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([])
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

  // MIME 타입 기준으로 이미지/동영상 여부를 판별해 업로드 분기를 단순화합니다.
  const isImageFile = (file: File) => ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])
  const isVideoFile = (file: File) => ALLOWED_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_VIDEO_TYPES)[number])

  // 파일명에서 확장자를 제외한 기본 이름을 뽑아 썸네일 파일명 생성에 사용합니다.
  const getFileBaseName = (fileName: string) => fileName.replace(/\.[^/.]+$/, "")

  // 파일 정책(타입/용량) 검사를 공통 함수로 묶어서 단일/대량 업로드에 재사용합니다.
  const validateMediaFile = (file: File, showToast = true) => {
    const isImage = isImageFile(file)
    const isVideo = isVideoFile(file)
    const isValidType = isImage || isVideo
    const maxSize = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES
    const isValidSize = file.size <= maxSize

    if (showToast && !isValidType) {
      toast.error(`${file.name} 파일 형식은 지원하지 않습니다.`)
    }
    if (showToast && !isValidSize) {
      const maxSizeMb = Math.floor(maxSize / (1024 * 1024))
      toast.error(`${file.name} 파일 크기는 최대 ${maxSizeMb}MB까지 허용됩니다.`)
    }

    return isValidType && isValidSize
  }

  // Presigned URL 발급 요청을 공통화해서 같은 key 생성 규칙을 유지합니다.
  const requestPresignedUploadUrl = async (params: {
    fileType: string
    bucketPath: string
    fileName: string
  }): Promise<PresignedUploadResponse> => {
    const query = new URLSearchParams({
      fileType: params.fileType,
      bucketPath: params.bucketPath,
      fileName: params.fileName,
    })
    const response = await fetch(`/api/presignedUrl?${query.toString()}`, { method: "GET" })
    if (!response.ok) {
      throw new Error("업로드 URL 발급에 실패했습니다.")
    }
    return response.json() as Promise<PresignedUploadResponse>
  }

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

  // 신규 업로드 key만 추적해서 롤백 시 기존 파일 삭제를 방지합니다.
  const pushRollbackKeys = (keys: string[]) => {
    for (const key of keys) {
      if (!uploadedCdnKeysRef.current.includes(key)) {
        uploadedCdnKeysRef.current.push(key)
      }
    }
  }

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

  // 이미지/동영상 업로드 공통 함수입니다.
  const uploadMedia = async (file: File): Promise<UploadMediaResult | null> => {
    try {
      if (!validateMediaFile(file)) {
        return null
      }

      // 원본 key는 파일명+포맷 기준으로 고정해서 같은 파일명이면 S3에서 덮어쓰기됩니다.
      const originalUpload = await requestPresignedUploadUrl({
        fileType: file.type,
        bucketPath: "products",
        fileName: file.name,
      })

      if (isVideoFile(file)) {
        const originalUploadResponse = await fetch(originalUpload.uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        })

        if (!originalUploadResponse.ok) {
          throw new Error("동영상 업로드 실패")
        }

        return {
          original: originalUpload.key,
          thumbnail: originalUpload.key,
          mediaType: "video",
          shouldCreateDbRecord: !originalUpload.alreadyExists,
          rollbackKeys: originalUpload.alreadyExists ? [] : [originalUpload.key],
        }
      }

      // 이미지는 기존 정책처럼 원본(압축)+썸네일을 각각 저장합니다.
      const compressedImage = await compressImage(file)
      const thumbnailImage = await createThumbnail(file)
      const thumbnailType = file.type === "image/gif" ? "image/gif" : "image/webp"
      const thumbnailExt = thumbnailType === "image/gif" ? "gif" : "webp"

      const thumbnailUpload = await requestPresignedUploadUrl({
        fileType: thumbnailType,
        bucketPath: "products/thumbnails",
        fileName: `${getFileBaseName(file.name)}-thumb.${thumbnailExt}`,
      })

      const originalUploadResponse = await fetch(originalUpload.uploadUrl, {
        method: "PUT",
        body: compressedImage,
        headers: {
          "Content-Type": file.type,
        },
      })

      if (!originalUploadResponse.ok) {
        throw new Error("원본 이미지 업로드 실패")
      }

      const thumbnailUploadResponse = await fetch(thumbnailUpload.uploadUrl, {
        method: "PUT",
        body: thumbnailImage,
        headers: {
          "Content-Type": thumbnailType,
        },
      })

      if (!thumbnailUploadResponse.ok) {
        throw new Error("썸네일 업로드 실패")
      }

      const rollbackKeys: string[] = []
      if (!originalUpload.alreadyExists) rollbackKeys.push(originalUpload.key)
      if (!thumbnailUpload.alreadyExists && thumbnailUpload.key !== originalUpload.key) {
        rollbackKeys.push(thumbnailUpload.key)
      }

      return {
        original: originalUpload.key,
        thumbnail: thumbnailUpload.key,
        mediaType: "image",
        shouldCreateDbRecord: !originalUpload.alreadyExists,
        rollbackKeys,
      }
    } catch (error) {
      console.error("미디어 업로드 중 오류 발생:", error)
      return null
    }
  }

  // 상품 생성 뮤테이션
  // useMutation은 React Query(또는 TanStack Query)의 훅으로, 
  // 서버에 데이터를 "변경"(생성, 수정, 삭제)할 때 사용합니다.
  // 여기서는 "신규 상품 생성"을 위해 서버에 POST 요청을 보내는 작업(그리고 뒤따르는 미디어 업로드 등) 
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
        let skippedDbCount = 0
        createdProductIdsRef.current.push(result.id)

        for (const preview of mediaPreviews) {
          const uploadResult = await uploadMedia(preview.file)
          if (!uploadResult) {
            throw new Error(`${preview.file.name} 업로드 실패`)
          }

          // 새로 생성된 S3 key만 롤백 대상에 넣습니다.
          pushRollbackKeys(uploadResult.rollbackKeys)

          // 기존 key를 덮어쓴 경우 DB 레코드는 추가하지 않습니다.
          if (!uploadResult.shouldCreateDbRecord) {
            skippedDbCount += 1
            continue
          }

          const imageResponse = await fetch(`/api/admin/products/${result.id}/images`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              original: uploadResult.original,
              thumbnail: uploadResult.thumbnail,
              mediaType: uploadResult.mediaType,
            }),
          })
          if (!imageResponse.ok) {
            throw new Error("미디어 정보 저장 실패")
          }
        }

        return { product: result, skippedDbCount }
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
    onSuccess: ({ skippedDbCount }) => {
      createdProductIdsRef.current = []
      uploadedCdnKeysRef.current = []
      if (skippedDbCount > 0) {
        // 중복 파일 처리 결과를 사용자에게 명확히 안내합니다.
        toast.info(`${skippedDbCount}개 파일은 기존 S3 파일을 덮어쓰고 DB 저장을 생략했습니다.`)
      }
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

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files);
    
    // 이미지/동영상 정책 검사(타입/크기)를 통과한 파일만 남깁니다.
    const validFiles = newFiles.filter((file) => validateMediaFile(file, true))
    
    // 새 미디어 미리보기를 생성합니다.
    const newPreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    
    // 미디어 미리보기가 되는 원리:
    // 브라우저의 URL.createObjectURL(file)을 사용하면 사용자의 로컬 파일 객체(file)에 대해 
    // 임시로 접근 가능한 URL을 만들어줌.
    // 이 URL을 <img>/<video> src에 넣으면 서버 전송 전에도 화면에서 바로 확인할 수 있음.
    setMediaPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeMedia = (index: number) => {
    // 미리보기 URL 객체 해제
    URL.revokeObjectURL(mediaPreviews[index].preview);
    
    // 미디어 및 미리보기 제거
    const newPreviews = [...mediaPreviews];
    newPreviews.splice(index, 1);
    setMediaPreviews(newPreviews);
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
    if (mediaPreviews.length === 0) {
      toast.error("최소 한 개 이상의 이미지/동영상을 업로드해주세요")
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
        let skippedDbCount = 0
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
            const uploadResult = await uploadMedia(file)
            if (!uploadResult) throw new Error(`${i + 1}번째 상품 미디어 업로드 실패`)
            pushRollbackKeys(uploadResult.rollbackKeys)

            // 기존 key를 덮어쓴 경우 DB 저장을 건너뜁니다.
            if (!uploadResult.shouldCreateDbRecord) {
              skippedDbCount += 1
              continue
            }

            const imgRes = await fetch(`/api/admin/products/${result.id}/images`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                original: uploadResult.original,
                thumbnail: uploadResult.thumbnail,
                mediaType: uploadResult.mediaType,
              }),
            })
            if (!imgRes.ok) throw new Error(`${i + 1}번째 상품 미디어 저장 실패`)
          }
        }
        return { created, skippedDbCount }
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
    onSuccess: ({ created, skippedDbCount }) => {
      createdProductIdsRef.current = []
      uploadedCdnKeysRef.current = []
      if (skippedDbCount > 0) {
        toast.info(`${skippedDbCount}개 파일은 기존 S3 파일을 덮어쓰고 DB 저장을 생략했습니다.`)
      }
      toast.success(`${created.length}건 등록되었습니다`)
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

  // handleSave 함수: 필수 필드(상품명, 설명, 카테고리, 가격, 재고, 이미지/동영상) 검증 후 
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
            <p className="text-sm text-muted-foreground">각 행에 상품 정보와 이미지/동영상을 입력한 뒤 일괄 등록하세요. 취소 시 이번에 생성한 항목만 롤백됩니다.</p>
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
                  <Label>이미지/동영상</Label>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : []
                      // 대량 등록도 단일 등록과 같은 파일 정책을 적용합니다.
                      const validFiles = files.filter((file) => validateMediaFile(file, true))
                      updateBatchRow(index, "files", validFiles)
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
          <TabsTrigger value="images">미디어</TabsTrigger>
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
              <CardTitle>상품 미디어</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="imageUpload" className="cursor-pointer">
                  <div className="border border-dashed rounded-lg p-8 flex flex-col items-center justify-center">
                    <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">이미지/동영상 파일을 드래그하거나 클릭하여 업로드</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      이미지: JPG/PNG/GIF/WEBP(최대 5MB), 동영상: MP4/WEBM/MOV(최대 100MB)
                    </p>
                  </div>
                  <Input
                    id="imageUpload"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                    multiple
                    className="hidden"
                    onChange={handleMediaUpload}
                  />
                </Label>
              </div>

              {mediaPreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {mediaPreviews.map((media, index) => (
                    <div key={index} className="relative border rounded-lg overflow-hidden h-40">
                      {isVideoMediaPath(media.file.name) || media.file.type.startsWith("video/") ? (
                        <video src={media.preview} className="w-full h-full object-cover" muted playsInline controls />
                      ) : (
                        <img
                          src={media.preview}
                          alt={`미리보기 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => removeMedia(index)}
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
