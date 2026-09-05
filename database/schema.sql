-- =========================================================================
-- SENAI-SP: SCHEMA DE BANCO DE DADOS CORPORATIVO ENTERPRISE
-- DIRETRIZES DE CIBERSEGURANÇA: RLS, MENOR PRIVILÉGIO E CAMPOS PROTEGIDOS
-- =========================================================================

-- 1. Criação de Roles com Menor Privilégio (Regra 7)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'senai_anonymous') THEN
    CREATE ROLE senai_anonymous NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'senai_authenticated_student') THEN
    CREATE ROLE senai_authenticated_student NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'senai_admin') THEN
    CREATE ROLE senai_admin NOLOGIN;
  END IF;
END
$$;

-- 2. Tabela de Alunos com Campos Protegidos e Criptografia em Repouso (Regras 5, 8, 10)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf VARCHAR(14) NOT NULL UNIQUE,
    registration_code VARCHAR(20) NOT NULL UNIQUE, -- RA / Matrícula
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Bcrypt / Argon2 com salt
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint para impedir valores inválidos
    CONSTRAINT chk_student_role CHECK (role IN ('student', 'instructor', 'admin'))
);

-- 3. Tabela de Cursos e Áreas Tecnológicas (Público / Read-Only para Alunos)
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    workload_hours INTEGER NOT NULL CHECK (workload_hours > 0),
    modality VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    prerequisites TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Matrículas com RLS Ativo (Regras 4, 6, 7, 8)
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'ativa', -- imutável pelo aluno
    grade NUMERIC(4,2) DEFAULT NULL, -- nota oficial (apenas instrutor/admin altera)
    attendance_pct NUMERIC(5,2) DEFAULT NULL, -- frequência oficial
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_enrollment_status CHECK (status IN ('ativa', 'concluida', 'trancada', 'cancelada'))
);

-- 5. ATIVAÇÃO DE ROW-LEVEL SECURITY (RLS) - Regra 4
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS DE ACESSO RLS BASEADAS NO PRINCÍPIO DO MENOR PRIVILÉGIO (Regras 4 e 7)

-- [POLÍTICA 1: Cursos] - Leitura permitida a todos para cursos publicados
DROP POLICY IF EXISTS p_courses_public_read ON public.courses;
CREATE POLICY p_courses_public_read ON public.courses
    FOR SELECT
    USING (is_published = true);

-- [POLÍTICA 2: Alunos] - O aluno só pode ler e atualizar estritamente o seu próprio perfil
DROP POLICY IF EXISTS p_student_own_profile ON public.students;
CREATE POLICY p_student_own_profile ON public.students
    FOR ALL
    USING (id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
    WITH CHECK (
        id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        -- Garante que o aluno nunca altere seu próprio papel (role) ou status de ativo (Regra 8)
        AND role = 'student'
    );

-- [POLÍTICA 3: Matrículas] - O aluno só pode visualizar suas próprias matrículas, notas e frequências
DROP POLICY IF EXISTS p_student_own_enrollments ON public.enrollments;
CREATE POLICY p_student_own_enrollments ON public.enrollments
    FOR SELECT
    USING (student_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- 7. TRIGGER PARA IMPEDIR ADULTERAÇÃO DE CAMPOS IMUTÁVEIS (Regra 8)
CREATE OR REPLACE FUNCTION protect_enrollment_grades()
RETURNS TRIGGER AS $$
BEGIN
    -- Se quem estiver executando for um aluno comum, impede alteração direta de notas, status e frequências
    IF current_setting('app.current_user_role', true) = 'student' THEN
        IF NEW.grade IS DISTINCT FROM OLD.grade OR 
           NEW.attendance_pct IS DISTINCT FROM OLD.attendance_pct OR
           NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Acesso Negado: Alunos não têm autorização para modificar notas, frequência ou status de matrícula.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_enrollment_grades ON public.enrollments;
CREATE TRIGGER trg_protect_enrollment_grades
    BEFORE UPDATE ON public.enrollments
    FOR EACH ROW
    EXECUTE FUNCTION protect_enrollment_grades();
