const supabase = require("../lib/supabase");

const TABLE_NAME = "performances";
const REQUIRED_FIELDS = ["title", "venue", "starts_at", "price"];

// 상태 코드를 담은 에러 생성 (app.js의 공통 에러 처리에서 사용)
function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// URL의 id 검증: 양의 정수만 허용
function parseId(rawId) {
  if (!/^[1-9]\d*$/.test(String(rawId))) {
    throw createHttpError(400, "공연 ID는 양의 정수여야 합니다.");
  }

  const id = Number(rawId);
  if (!Number.isSafeInteger(id)) {
    throw createHttpError(400, "공연 ID는 양의 정수여야 합니다.");
  }

  return id;
}

// 문자열 검증: 빈 문자열과 공백만 있는 값은 거부
function validateText(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw createHttpError(
      400,
      `${fieldName}은(는) 빈 값이 아닌 문자열이어야 합니다.`,
    );
  }
  return value.trim();
}

// 날짜 검증: 유효한 날짜 문자열만 허용하고 ISO 형식으로 변환
function validateStartsAt(value) {
  if (typeof value !== "string") {
    throw createHttpError(400, "starts_at은 날짜 문자열이어야 합니다.");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(
      400,
      "starts_at은 유효한 날짜 형식이어야 합니다. 예: 2026-12-20T19:00:00+09:00",
    );
  }

  return date.toISOString();
}

// 가격 검증: 0 이상의 정수만 허용
function validatePrice(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw createHttpError(400, "price는 0 이상의 정수여야 합니다.");
  }
  return value;
}

// [과제 1] 공연 목록 조회
async function getPerformances(req, res, next) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

// [과제 2] 공연 등록
async function createPerformance(req, res, next) {
  try {
    const body = req.body || {};

    const missingFields = REQUIRED_FIELDS.filter(
      (field) =>
        body[field] === undefined || body[field] === null || body[field] === "",
    );

    if (missingFields.length > 0) {
      throw createHttpError(
        400,
        `필수 항목이 누락되었습니다: ${missingFields.join(", ")}`,
      );
    }

    const newPerformance = {
      title: validateText(body.title, "title"),
      venue: validateText(body.venue, "venue"),
      starts_at: validateStartsAt(body.starts_at),
      price: validatePrice(body.price),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(newPerformance)
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: "공연 등록 완료",
      performance: data,
    });
  } catch (error) {
    next(error);
  }
}

// [과제 3] 공연 수정
async function updatePerformance(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const body = req.body || {};

    // 전달된 항목만 검증 후 updates에 담습니다.
    const updates = {};

    if (body.title !== undefined) {
      updates.title = validateText(body.title, "title");
    }
    if (body.venue !== undefined) {
      updates.venue = validateText(body.venue, "venue");
    }
    if (body.starts_at !== undefined) {
      updates.starts_at = validateStartsAt(body.starts_at);
    }
    if (body.price !== undefined) {
      updates.price = validatePrice(body.price);
    }

    if (Object.keys(updates).length === 0) {
      throw createHttpError(
        400,
        "수정할 항목이 없습니다. title, venue, starts_at, price 중 하나 이상을 보내 주세요.",
      );
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw createHttpError(404, "해당 공연을 찾을 수 없습니다.");
    }

    return res.status(200).json({
      message: "공연 수정 완료",
      performance: data,
    });
  } catch (error) {
    next(error);
  }
}

// [과제 4] 공연 삭제
async function deletePerformance(req, res, next) {
  try {
    const id = parseId(req.params.id);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw createHttpError(404, "해당 공연을 찾을 수 없습니다.");
    }

    return res.status(200).json({
      message: "공연 삭제 완료",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPerformances,
  createPerformance,
  updatePerformance,
  deletePerformance,
};
